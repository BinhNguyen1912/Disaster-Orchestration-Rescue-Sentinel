import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { SosRequest } from '../../domain/entities/sos-request.entity';
import { RescueTeam } from '../../../rescue-team/domain/entities/rescue-team';
import { SosRequestEntity } from '@infrastructure/database/entities/sos-request.entity';
import { RescueTeamEntity } from '@infrastructure/database/entities/rescue-team.entity';
import { DispatchQueueEntity } from '@infrastructure/database/entities/dispatch-queue.entity';
import {
  SosStatusHistoryEntity,
  SosHistoryEventType,
} from '@infrastructure/database/entities/sos-status-history.entity';
import { SosStatus } from '@shared/core/enums/sosStatus.enum';
import { TeamStatus } from '@shared/core/enums/teamStatus.enum';
import { DispatchMethod } from '@shared/core/enums/dispatchMethod.enum';
import { Severity } from '@shared/core/enums/level.enum';
import {
  DISPATCH_KEYS,
  DISPATCH_DEFAULTS,
} from '@shared/common/constants/dispatch.constant';
import type { IDispatchStrategy } from './dispatch.strategy.interface';
import type { IRescueTeamRepository } from '../../../rescue-team/domain/repositories/rescue-team.repository.interface';
import type { IDispatchQueueRepository } from '../../domain/repositories/dispatch-queue.repository.interface';
import { SystemSettingService } from '../../../system-setting/application/services/system-setting.service';
import { DispatchSocketService } from '../../../websocket/services/dispatch-socket.service';
import { DispatchOutcome } from '../interfaces/dispatchOutCome.interface';

const SEVERITY_WEIGHTS: Record<Severity, number> = {
  [Severity.CRITICAL]: 100,
  [Severity.HIGH]: 50,
  [Severity.MEDIUM]: 20,
  [Severity.LOW]: 10,
};

@Injectable()
export class DispatchOrchestratorService {
  private readonly logger = new Logger(DispatchOrchestratorService.name);

  constructor(
    private readonly dataSource: DataSource,
    @Inject('IDispatchStrategy')
    private readonly dispatchStrategy: IDispatchStrategy,
    @Inject('IRescueTeamRepository')
    private readonly teamRepo: IRescueTeamRepository,
    @Inject('IDispatchQueueRepository')
    private readonly dispatchQueueRepo: IDispatchQueueRepository,
    private readonly systemSettingService: SystemSettingService,
    private readonly dispatchSocketService: DispatchSocketService,
    @InjectRepository(SosStatusHistoryEntity)
    private readonly historyRepo: Repository<SosStatusHistoryEntity>,
  ) { }

  /**
   * Entry point cho auto-dispatch: Nhận SOS, chạy Two-Phase scoring,
   * quyết định Single/Dual dispatch, commit trong transaction ngắn.
   */
  async dispatch(
    sosRequest: SosRequest,
    manager?: EntityManager,
  ): Promise<DispatchOutcome> {
    // 1. Chạy strategy tìm candidates (ở ngoài transaction để giữ lock duration tối thiểu)
    const result = await this.dispatchStrategy.assignTeam(sosRequest);
    if (!result) {
      this.logger.warn(
        `[Orchestrator] No candidates found in any radius steps for SOS ${sosRequest.id}. Entering fallback cấp 3.`,
      );

      // Fallback Cấp 3: Specialist Pending (chờ specialist)
      const executeFallback = async (txManager: EntityManager) => {
        const dbSos = await txManager.findOne(SosRequestEntity, {
          where: { id: sosRequest.id },
        });
        if (dbSos) {
          dbSos.specialistPending = true;
          dbSos.specialistType = sosRequest.requestType;
          dbSos.pendingSince = new Date();
          dbSos.status = SosStatus.PENDING_SPECIALIST;
          await txManager.save(SosRequestEntity, dbSos);
        }
      };

      if (manager) {
        await executeFallback(manager);
      } else {
        await this.dataSource.transaction(executeFallback);
      }

      this.dispatchSocketService.alertNoTeamAvailable(
        sosRequest.provinceId,
        sosRequest.id,
      );

      // 📝 History: Specialist pending
      this.recordHistory({
        sosRequestId: sosRequest.id,
        eventType: SosHistoryEventType.SPECIALIST_PENDING,
        fromStatus: SosStatus.PENDING,
        toStatus: SosStatus.PENDING_SPECIALIST,
        note: 'Không tìm thấy đội nào phù hợp. Chuyển sang chờ đội chuyên môn.',
      }, manager);

      return { type: 'specialist_pending' as const };
    }

    // 2. Mở transaction ngắn để lock team và thực hiện atomic commit
    const commitTx = async (txManager: EntityManager): Promise<DispatchOutcome> => {
      // Tìm đội khả dụng đầu tiên trong danh sách xếp hạng
      let selectedTeam: RescueTeam | null = null;

      for (const candidate of result.rankedCandidates) {
        const team = await this.teamRepo.lockTeamForUpdate(
          candidate.teamId,
          txManager,
        );
        if (
          team &&
          (team.status === TeamStatus.AVAILABLE ||
            team.status === TeamStatus.STANDBY)
        ) {
          selectedTeam = team;
          break;
        }
      }

      const priorityScore = SEVERITY_WEIGHTS[sosRequest.severity] || 10;

      // 3. Nếu không có đội nào khả dụng (tất cả bận), tiến hành xếp hàng
      if (!selectedTeam) {
        this.logger.log(
          `[Orchestrator] All candidate teams busy for SOS ${sosRequest.id}. Queueing request.`,
        );

        // Tie-break rule: Ưu tiên Chuyên môn (Specialization-First) nếu requiresEquipment = true
        let bestQueueTeam = result.rankedCandidates[0];
        if (this.requiresDualDispatch(sosRequest)) {
          const settings = await this.systemSettingService.getAllSettings();
          let minMismatch = Infinity;
          for (const cand of result.rankedCandidates) {
            const mismatch = this.getSkillMismatch(
              settings,
              sosRequest.requestType,
              cand.teamType,
            );
            if (mismatch < minMismatch) {
              minMismatch = mismatch;
              bestQueueTeam = cand;
            }
          }
        }

        // Tạo bản ghi hàng chờ (isDualDispatch = false vì đây là hàng chờ đơn)
        await this.dispatchQueueRepo.createQueueEntry(
          {
            sosRequestId: sosRequest.id,
            teamId: bestQueueTeam.teamId,
            provinceId: sosRequest.provinceId,
            isDualDispatch: false,
            priorityScore,
          },
          txManager,
        );

        // Cập nhật SOS status PENDING và không gán team
        const dbSos = await txManager.findOne(SosRequestEntity, {
          where: { id: sosRequest.id },
        });
        if (dbSos) {
          dbSos.status = SosStatus.PENDING;
          dbSos.assignedTeamId = undefined;
          await txManager.save(SosRequestEntity, dbSos);
        }

        // 📝 History: Queued
        this.recordHistory({
          sosRequestId: sosRequest.id,
          eventType: SosHistoryEventType.QUEUED,
          fromStatus: SosStatus.PENDING,
          toStatus: SosStatus.PENDING,
          teamId: bestQueueTeam.teamId,
          dispatchMethod: DispatchMethod.AUTO,
          note: `Yêu cầu được xếp hàng chờ đội cứu hộ #${bestQueueTeam.teamId}.`,
        }, txManager);

        return {
          type: 'queued' as const,
          assignedTeamId: bestQueueTeam.teamId,
        };
      }

      // 4. Có đội khả dụng -> Gán primary team ngay
      this.logger.log(
        `[Orchestrator] Dispatched team ${selectedTeam.id} immediately for SOS ${sosRequest.id}.`,
      );

      const dbSos = await txManager.findOne(SosRequestEntity, {
        where: { id: sosRequest.id },
      });

      const candidateInfo = result.rankedCandidates.find((c) => c.teamId === selectedTeam!.id);
      const etaFields = candidateInfo ? {
        etaIdealMinutes: candidateInfo.etaIdealMinutes,
        etaRealisticMinutes: candidateInfo.etaRealisticMinutes,
        trafficDelayMinutes: candidateInfo.trafficDelayMinutes,
        trafficNote: candidateInfo.trafficNote,
      } : {};

      if (dbSos) {
        dbSos.assignedTeamId = selectedTeam.id;
        dbSos.assignedAt = new Date();
        dbSos.status = SosStatus.DISPATCHED;
        dbSos.dispatchMethod = DispatchMethod.AUTO;
        // Reset specialist fields if any
        dbSos.specialistPending = false;
        dbSos.specialistType = undefined;
        dbSos.pendingSince = undefined;

        if (candidateInfo) {
          dbSos.etaIdealMinutes = candidateInfo.etaIdealMinutes;
          dbSos.etaRealisticMinutes = candidateInfo.etaRealisticMinutes;
          dbSos.trafficDelayMinutes = candidateInfo.trafficDelayMinutes;
          dbSos.trafficNote = candidateInfo.trafficNote;
          dbSos.distanceKm = candidateInfo.distanceMeters ? candidateInfo.distanceMeters / 1000 : null;
        }

        await txManager.save(SosRequestEntity, dbSos);
      }

      selectedTeam.status = TeamStatus.DISPATCHED;
      selectedTeam.activeCasesCount = (selectedTeam.activeCasesCount || 0) + 1;
      await txManager.save(RescueTeamEntity, selectedTeam);

      // 5. Kiểm tra Dual Dispatch (chỉ áp dụng khi requiresEquipment/requestType requires it)
      if (this.requiresDualDispatch(sosRequest)) {
        const settings = await this.systemSettingService.getAllSettings();
        const primaryMismatch = this.getSkillMismatch(
          settings,
          sosRequest.requestType,
          selectedTeam.teamType || '',
        );

        // Nếu đội được gán chưa khớp chuyên môn hoàn hảo (mismatch > 0),
        // và trong pool có đội specialist khớp hoàn hảo đang bận, ta kích hoạt Dual Dispatch
        if (primaryMismatch > 0.0) {
          let busySpecialistCand: any = null;
          for (const cand of result.rankedCandidates) {
            if (cand.teamId === selectedTeam.id) continue;
            const mismatch = this.getSkillMismatch(
              settings,
              sosRequest.requestType,
              cand.teamType,
            );
            if (mismatch === 0.0) {
              busySpecialistCand = cand;
              break;
            }
          }

          if (busySpecialistCand) {
            // Kiểm tra quota Dual Dispatch
            const canDual = await this.tryStartDualDispatch(
              sosRequest.provinceId,
              txManager,
            );
            if (canDual) {
              this.logger.log(
                `[Orchestrator] Dual Dispatch activated: Team ${selectedTeam.id} en-route, specialist Team ${busySpecialistCand.teamId} queued.`,
              );

              await this.dispatchQueueRepo.createQueueEntry(
                {
                  sosRequestId: sosRequest.id,
                  teamId: busySpecialistCand.teamId,
                  provinceId: sosRequest.provinceId,
                  isDualDispatch: true,
                  priorityScore,
                },
                txManager,
              );

              // 📝 History: Dual dispatch - primary team
              this.recordHistory({
                sosRequestId: sosRequest.id,
                eventType: SosHistoryEventType.TEAM_ASSIGNED,
                fromStatus: SosStatus.PENDING,
                toStatus: SosStatus.DISPATCHED,
                teamId: selectedTeam.id,
                dispatchMethod: DispatchMethod.AUTO,
                note: `Tự động phân công đội cứu hộ #${selectedTeam.id}. Đội chuyên môn #${busySpecialistCand.teamId} đang chờ sẵn.`,
              }, txManager);

              return {
                type: 'dual_dispatched' as const,
                assignedTeamId: selectedTeam.id,
                secondTeamId: busySpecialistCand.teamId,
                ...etaFields,
              };
            } else {
              this.logger.log(
                `[Orchestrator] Dual Dispatch quota reached for province ${sosRequest.provinceId}. Fallback to Single Dispatch.`,
              );
            }
          }
        }
      }

      // 📝 History: Single auto-dispatch
      this.recordHistory({
        sosRequestId: sosRequest.id,
        eventType: SosHistoryEventType.TEAM_ASSIGNED,
        fromStatus: SosStatus.PENDING,
        toStatus: SosStatus.DISPATCHED,
        teamId: selectedTeam.id,
        dispatchMethod: DispatchMethod.AUTO,
        note: `Tự động phân công đội cứu hộ #${selectedTeam.id}.`,
      }, txManager);

      return {
        type: 'dispatched' as const,
        assignedTeamId: selectedTeam.id,
        ...etaFields,
      };
    };

    if (manager) {
      return await commitTx(manager);
    } else {
      return await this.dataSource.transaction(commitTx);
    }
  }

  /**
   * Bàn giao Atomic khi một đội hoàn thành ca nhiệm vụ.
   */
  async releaseTeamAndResolveQueue(teamId: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      // 1. Lock dòng đội cứu hộ
      const team = await this.teamRepo.lockTeamForUpdate(teamId, manager);
      if (!team) {
        this.logger.warn(`[Handoff] Team ${teamId} not found, cannot release.`);
        return;
      }

      // 2. Tìm ca tiếp theo đang xếp hàng của đội này dùng SKIP LOCKED
      const nextInQueue = await this.dispatchQueueRepo.findNextInQueue(
        teamId,
        manager,
      );

      if (nextInQueue) {
        this.logger.log(
          `[Handoff] Found next SOS ${nextInQueue.sosRequestId} in queue for team ${teamId}. Atomic assignment.`,
        );

        // 3a. Có hàng chờ -> Gán ngay lập tức
        const nextSos = await manager.findOne(SosRequestEntity, {
          where: { id: nextInQueue.sosRequestId },
        });
        if (nextSos) {
          nextSos.assignedTeamId = team.id;
          nextSos.status = SosStatus.DISPATCHED;
          nextSos.assignedAt = new Date();
          nextSos.dispatchMethod = DispatchMethod.AUTO;
          nextSos.specialistPending = false;
          nextSos.specialistType = undefined;
          nextSos.pendingSince = undefined;
          await manager.save(SosRequestEntity, nextSos);

          // Phát realtime broadcast thông báo gán việc mới
          this.dispatchSocketService.broadcastSosStatusUpdate(
            nextSos.provinceId,
            {
              sosId: nextSos.id,
              status: nextSos.status,
              assignedTeamId: team.id,
            },
          );
          this.dispatchSocketService.notifyTeamAssigned(team.id, nextSos);
        }

        // Tải trọng giữ nguyên (bớt 1 ca cũ, thêm 1 ca mới)
        team.activeCasesCount =
          Math.max(0, (team.activeCasesCount ?? 1) - 1) + 1;
        team.status = TeamStatus.DISPATCHED;
        await manager.save(RescueTeamEntity, team);

        // Xóa hàng chờ trong DB
        await this.dispatchQueueRepo.deleteById(nextInQueue.id, manager);

        // 📝 History: Handoff - team gán ca tiếp theo từ queue
        this.recordHistory({
          sosRequestId: nextInQueue.sosRequestId,
          eventType: SosHistoryEventType.TEAM_ASSIGNED,
          fromStatus: SosStatus.PENDING,
          toStatus: SosStatus.DISPATCHED,
          teamId: team.id,
          dispatchMethod: DispatchMethod.AUTO,
          note: `Đội cứu hộ #${team.id} vừa hoàn thành ca trước, chuyển sang ca tiếp theo.`,
        });
      } else {
        // 3b. Không còn hàng chờ -> Giải phóng đội về AVAILABLE
        this.logger.log(
          `[Handoff] No queue entries for team ${teamId}. Releasing team to AVAILABLE.`,
        );

        const activeCases = Math.max(0, (team.activeCasesCount ?? 1) - 1);
        team.activeCasesCount = activeCases;
        if (activeCases === 0) {
          team.status = TeamStatus.AVAILABLE;
        } else {
          // Vẫn còn ca khác chưa giải quyết (vd: được gán tay song song)
          team.status = TeamStatus.BUSY;
        }
        await manager.save(RescueTeamEntity, team);
      }
    });
  }

  /**
   * Manual dispatch: Độc lập với scoring auto, gán trực tiếp một đội cụ thể.
   */
  async dispatchManual(
    sosRequestId: number,
    teamId: number,
    userId: number,
    manager?: EntityManager,
  ): Promise<DispatchOutcome> {
    const executeManual = async (txManager: EntityManager): Promise<DispatchOutcome> => {
      const sos = await txManager.findOne(SosRequestEntity, {
        where: { id: sosRequestId },
      });
      if (!sos) {
        throw new NotFoundException(
          `Không tìm thấy yêu cầu SOS với ID ${sosRequestId}`,
        );
      }
      if (
        sos.status === SosStatus.RESOLVED ||
        sos.status === SosStatus.CANCELLED
      ) {
        throw new BadRequestException(
          'Không thể phân công cho yêu cầu SOS đã hoàn thành hoặc đã hủy',
        );
      }

      const team = await this.teamRepo.lockTeamForUpdate(teamId, txManager);
      if (!team) {
        throw new NotFoundException(
          `Không tìm thấy đội cứu hộ với ID ${teamId}`,
        );
      }

      // Giải phóng đội cũ nếu có chuyển đội
      if (sos.assignedTeamId && sos.assignedTeamId !== team.id) {
        const oldTeam = await this.teamRepo.lockTeamForUpdate(
          sos.assignedTeamId,
          txManager,
        );
        if (oldTeam) {
          const oldActiveCases = Math.max(
            0,
            (oldTeam.activeCasesCount || 0) - 1,
          );
          oldTeam.activeCasesCount = oldActiveCases;
          if (oldActiveCases === 0 && oldTeam.status === TeamStatus.BUSY) {
            oldTeam.status = TeamStatus.AVAILABLE;
          }
          await txManager.save(RescueTeamEntity, oldTeam);
        }
      }

      // Cập nhật SOS request
      sos.assignedTeamId = team.id;
      sos.assignedAt = new Date();
      sos.assignedBy = userId;
      sos.status = SosStatus.DISPATCHED;
      sos.dispatchMethod = DispatchMethod.MANUAL;
      sos.specialistPending = false;
      sos.specialistType = undefined;
      sos.pendingSince = undefined;

      const teamLoc = (team.currentLocation || team.baseLocation) as any;
      sos.distanceKm = this.calculateDistanceKm(sos.location, teamLoc);

      await txManager.save(SosRequestEntity, sos);

      // Cập nhật đội mới
      team.status = TeamStatus.DISPATCHED;
      team.activeCasesCount = (team.activeCasesCount || 0) + 1;
      await txManager.save(RescueTeamEntity, team);

      // History: Manual dispatch trong orchestrator (reassign)
      const isReassign = !!sos.assignedTeamId && sos.assignedTeamId !== team.id;
      this.recordHistory({
        sosRequestId: sosRequestId,
        eventType: isReassign
          ? SosHistoryEventType.TEAM_REASSIGNED
          : SosHistoryEventType.TEAM_ASSIGNED,
        fromStatus: SosStatus.PENDING,
        toStatus: SosStatus.DISPATCHED,
        changedById: userId,
        teamId: team.id,
        previousTeamId: isReassign ? (sos.assignedTeamId ?? null) : null,
        dispatchMethod: DispatchMethod.MANUAL,
        note: isReassign
          ? `Chuyển đội cứu hộ từ #${sos.assignedTeamId} sang #${team.id}`
          : `Thủ công phân công đội cứu hộ #${team.id}`,
      }, txManager);

      return {
        type: 'dispatched' as const,
        assignedTeamId: team.id,
      };
    };

    if (manager) {
      return await executeManual(manager);
    } else {
      return await this.dataSource.transaction(executeManual);
    }
  }

  /**
   * Đọc skill mapping để lấy mismatch của team type
   */
  private getSkillMismatch(
    settings: Record<string, string>,
    requestType: string,
    teamType: string,
  ): number {
    try {
      const raw = settings[DISPATCH_KEYS.SKILL_MAPPING];
      if (raw) {
        const parsed = JSON.parse(raw);
        const mapping = parsed[requestType];
        if (mapping && mapping[teamType] !== undefined) {
          return mapping[teamType];
        }
      }
    } catch {
      // Ignored, fallback to defaults
    }

    const defaultMapping = DISPATCH_DEFAULTS.SKILL_MAPPING[requestType];
    if (defaultMapping && defaultMapping[teamType] !== undefined) {
      return defaultMapping[teamType];
    }

    return 1.0;
  }

  /**
   * Kiểm tra xem SOS request này có cần thiết bị chuyên dụng hay không.
   */
  private requiresDualDispatch(sosRequest: SosRequest): boolean {
    return (
      !!sosRequest.requiresEquipment ||
      (
        DISPATCH_DEFAULTS.REQUIRES_EQUIPMENT_TYPES as readonly string[]
      ).includes(sosRequest.requestType)
    );
  }

  /**
   * Đếm số ca Dual Dispatch thực tế đang chạy của tỉnh bằng Postgres pessimistic write lock
   */
  private async tryStartDualDispatch(
    provinceId: number,
    manager: EntityManager,
  ): Promise<boolean> {
    const settings = await this.systemSettingService.getAllSettings();
    const maxDual = parseInt(
      settings[DISPATCH_KEYS.MAX_SIMULTANEOUS_DUAL_DISPATCHES] ??
      String(DISPATCH_DEFAULTS.MAX_SIMULTANEOUS_DUAL_DISPATCHES),
      10,
    );

    const result = await manager
      .createQueryBuilder(DispatchQueueEntity, 'dq')
      .select('COUNT(*)', 'cnt')
      .where('dq.isDualDispatch = true')
      .andWhere('dq.provinceId = :provinceId', { provinceId })
      .setLock('pessimistic_write')
      .getRawOne();

    const currentCount = parseInt(result?.cnt ?? '0', 10);
    return currentCount < maxDual;
  }

  /**
   * Fire-and-forget helper để ghi lịch sử (non-fatal).
   */
  private recordHistory(
    opts: {
      sosRequestId: number;
      eventType: SosHistoryEventType;
      fromStatus?: SosStatus | null;
      toStatus?: SosStatus | null;
      changedById?: number | null;
      teamId?: number | null;
      previousTeamId?: number | null;
      dispatchMethod?: DispatchMethod | null;
      note?: string | null;
    },
    manager?: EntityManager,
  ): void {
    const entry = manager
      ? manager.create(SosStatusHistoryEntity, {
        sosRequestId: opts.sosRequestId,
        eventType: opts.eventType,
        fromStatus: opts.fromStatus ?? null,
        toStatus: opts.toStatus ?? null,
        changedById: opts.changedById ?? null,
        teamId: opts.teamId ?? null,
        previousTeamId: opts.previousTeamId ?? null,
        dispatchMethod: opts.dispatchMethod ?? null,
        note: opts.note ?? null,
      })
      : this.historyRepo.create({
        sosRequestId: opts.sosRequestId,
        eventType: opts.eventType,
        fromStatus: opts.fromStatus ?? null,
        toStatus: opts.toStatus ?? null,
        changedById: opts.changedById ?? null,
        teamId: opts.teamId ?? null,
        previousTeamId: opts.previousTeamId ?? null,
        dispatchMethod: opts.dispatchMethod ?? null,
        note: opts.note ?? null,
      });
    const savePromise = manager
      ? manager.save(SosStatusHistoryEntity, entry)
      : this.historyRepo.save(entry);
    savePromise.catch((err) => {
      this.logger.error(
        '[DispatchOrchestrator] Failed to record SOS history:',
        err,
      );
    });
  }

  /**
   * Tính toán khoảng cách địa lý Haversine giữa 2 toạ độ hình học
   */
  private calculateDistanceKm(loc1: any, loc2: any): number | null {
    if (!loc1?.coordinates || !loc2?.coordinates) return null;
    const [lng1, lat1] = loc1.coordinates;
    const [lng2, lat2] = loc2.coordinates;
    if (!lat1 || !lng1 || !lat2 || !lng2) return null;

    const R = 6371; // km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lng2 - lng1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
