import {
  BadRequestException,
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogEntity } from '@infrastructure/database/entities/audit-log.entity';
import { CreateSosRequestDto } from '../dtos/create-sos-request.dto';
import { LocationService } from '../../../location/application/services/location.service';
import { QuerySosRequestDto } from '../dtos/query-sos-request.dto';
import { UpdateSosStatusDto } from '../dtos/update-sos-status.dto';
import { AssignTeamDto } from '../dtos/assign-team.dto';
import { CancelSosRequestDto } from '../dtos/cancel-sos-request.dto';
import { SosRequest } from '../../domain/entities/sos-request.entity';
import { AccessTokenPayload } from '../../../auth/domain/interfaces/jwt-payload.interface';
import { SosStatus } from '@shared/core/enums/sosStatus.enum';
import { SosSource } from '@shared/core/enums/sosSource.enum';
import { TeamStatus } from '@shared/core/enums/teamStatus.enum';
import { DispatchMethod } from '@shared/core/enums/dispatchMethod.enum';
import { SystemRoleId } from '@shared/common/constants/permissions.constant';
import { PaginatedResult } from '@shared/common/dtos/pagination.dto';
import { INTERNAL_EVENTS } from '@shared/common/constants/events.constant';
import { DispatchSocketService } from '../../../websocket/services/dispatch-socket.service';
import { DispatchOrchestratorService } from './dispatch-orchestrator.service';
import { SosHistoryService } from './sos-history.service';
import { SosHistoryEventType } from '@infrastructure/database/entities/sos-status-history.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';

import type {
  ISosRequestRepository,
  QuerySosParams,
} from '../../domain/repositories/sos-request.repository.interface';
import type { IRescueTeamRepository } from '../../../rescue-team/domain/repositories/rescue-team.repository.interface';
import type { IDispatchStrategy } from './dispatch.strategy.interface';
import type { ISosRequestService } from '../interfaces/sos-request.service.interface';

@Injectable()
export class SosRequestService implements ISosRequestService {
  constructor(
    @Inject('ISosRequestRepository')
    private readonly sosRepo: ISosRequestRepository,
    @Inject('IRescueTeamRepository')
    private readonly teamRepo: IRescueTeamRepository,
    @Inject('IDispatchStrategy')
    private readonly dispatchStrategy: IDispatchStrategy,
    private readonly locationService: LocationService,
    private readonly dispatchSocketService: DispatchSocketService,
    private readonly dispatchOrchestrator: DispatchOrchestratorService,
    private readonly sosHistoryService: SosHistoryService,
    @InjectRepository(AuditLogEntity)
    private readonly auditLogRepo: Repository<AuditLogEntity>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private async logAction(
    action: string,
    sosId: number,
    userId: number | null,
    provinceId: number,
    metadata: any,
  ) {
    try {
      const log = this.auditLogRepo.create({
        action,
        resourceType: 'SosRequest',
        resourceId: sosId,
        userId: userId || undefined,
        provinceId,
        metadata,
      });
      await this.auditLogRepo.save(log);
    } catch (err) {
      console.error('Failed to write audit log:', err);
    }
  }

  async create(
    dto: CreateSosRequestDto,
    user?: AccessTokenPayload,
  ): Promise<SosRequest> {
    const isGuest = !user;

    // BR-SOS-02: Unauthenticated/guest users MUST attach at least 1 image
    if (isGuest) {
      if (!dto.requesterName || !dto.requesterPhone) {
        throw new BadRequestException(
          'Họ tên và số điện thoại là bắt buộc đối với khách',
        );
      }
      if (!dto.imageUrls || dto.imageUrls.length === 0) {
        throw new BadRequestException(
          'Yêu cầu SOS gửi từ khách phải đính kèm nhất 1 hình ảnh hiện trường thực tế',
        );
      }
    }

    const requesterId = user ? user.sub : null;
    const requesterName = user ? dto.requesterName || null : dto.requesterName;
    const requesterPhone = user
      ? dto.requesterPhone || null
      : dto.requesterPhone;

    let provinceId = dto.provinceId;
    let adminUnitId = dto.adminUnitId;

    if (!provinceId || !adminUnitId) {
      const resolvedUnit = await this.locationService.findUnitByCoordinates(
        dto.latitude,
        dto.longitude,
      );
      if (resolvedUnit) {
        provinceId = resolvedUnit.provinceId;
        adminUnitId = resolvedUnit.id;
      } else {
        const defaultUnit = await this.locationService.findFirstUnit();
        if (defaultUnit) {
          provinceId = defaultUnit.provinceId;
          adminUnitId = defaultUnit.id;
        } else {
          provinceId = provinceId || 1;
          adminUnitId = adminUnitId || 1;
        }
      }
    }

    const sosData: Partial<SosRequest> = {
      provinceId,
      adminUnitId,
      requesterId,
      requesterName,
      requesterPhone,
      location: {
        type: 'Point',
        coordinates: [dto.longitude, dto.latitude],
      },
      requestType: dto.requestType,
      status: SosStatus.PENDING,
      severity: dto.severity,
      trappedPeopleCount: dto.trappedPeopleCount || 1,
      specialNeedsTags: dto.specialNeedsTags || [],
      imageUrls: dto.imageUrls || [],
      description: dto.description || '',
      source: user ? SosSource.APP : SosSource.WEB,
      requiresEquipment: dto.requiresEquipment || false,
    };

    const created = await this.sosRepo.create(sosData);

    // 📡 Emit internal event for async dispatch processing
    this.eventEmitter.emit(INTERNAL_EVENTS.SOS_CREATED, { sosId: created.id });

    // 📡 Realtime: Notify admins in the same province about the new SOS request
    this.dispatchSocketService.broadcastNewSos(created.provinceId, created);

    await this.logAction(
      'CREATE',
      created.id,
      user ? user.sub : null,
      created.provinceId,
      {
        description: user
          ? 'Người dùng gửi yêu cầu khẩn cấp qua ứng dụng di động.'
          : 'Khách gửi yêu cầu khẩn cấp qua cổng web.',
      },
    );

    // 📝 History: Ghi nhận sự kiện tạo SOS
    await this.sosHistoryService.record({
      sosRequestId: created.id,
      eventType: SosHistoryEventType.CREATED,
      toStatus: SosStatus.PENDING,
      changedById: user ? user.sub : null,
      note: user
        ? 'Người dùng gửi yêu cầu khẩn cấp qua ứng dụng di động.'
        : 'Khách gửi yêu cầu khẩn cấp qua cổng web.',
    });

    return created;
  }

  async findAll(
    dto: QuerySosRequestDto,
    user: AccessTokenPayload,
  ): Promise<PaginatedResult<SosRequest>> {
    const filters: QuerySosParams = { ...dto };

    // BR-TENANT-01 / BR-TENANT-02: Scoped by provinceId unless SYSTEM_ADMIN
    if (user.roleId !== SystemRoleId.SYSTEM_ADMIN) {
      filters.provinceId = user.provinceId;
    }

    // Residents can only see their own SOS requests
    if (user.roleId === SystemRoleId.USER) {
      filters.requesterId = user.sub;
    }

    const page = dto.page || 1;
    const limit = dto.limit || 20;

    return this.sosRepo.findAllPaginated(filters, { page, limit });
  }

  async findNearby(
    lat: number,
    lng: number,
    radiusKm: number = 5,
    status: SosStatus = SosStatus.PENDING,
    user: AccessTokenPayload,
  ): Promise<(SosRequest & { distance_km: number })[]> {
    if (lat === undefined || lng === undefined) {
      throw new BadRequestException('Vĩ độ (lat) và kinh độ (lng) là bắt buộc');
    }

    const nearbyRequests = await this.sosRepo.findNearby(
      lat,
      lng,
      radiusKm,
      status,
    );

    // Filter by provinceId if not SYSTEM_ADMIN
    if (user.roleId !== SystemRoleId.SYSTEM_ADMIN) {
      return nearbyRequests.filter((req) => req.provinceId === user.provinceId);
    }

    return nearbyRequests;
  }

  async updateStatus(
    id: number,
    dto: UpdateSosStatusDto,
    user: AccessTokenPayload,
  ): Promise<SosRequest> {
    const sos = await this.sosRepo.findById(id);
    if (!sos) {
      throw new NotFoundException(`Không tìm thấy yêu cầu SOS với ID ${id}`);
    }

    if (
      sos.status === SosStatus.RESOLVED ||
      sos.status === SosStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Không thể thay đổi trạng thái của yêu cầu SOS đã hoàn thành hoặc đã hủy',
      );
    }

    const oldStatus = sos.status;
    const newStatus = dto.status;

    // Transition checks
    if (newStatus === SosStatus.PENDING && oldStatus !== SosStatus.PENDING) {
      throw new BadRequestException(
        'Không thể quay về trạng thái PENDING khi đã gán đội',
      );
    }

    sos.status = newStatus;
    if (dto.resolutionNotes) {
      sos.resolutionNotes = dto.resolutionNotes;
    }

    if (newStatus === SosStatus.RESOLVED) {
      sos.resolvedAt = new Date();
      sos.resolvedBy = user.sub;

      // Release team workload and resolve queue
      if (sos.assignedTeamId) {
        await this.dispatchOrchestrator.releaseTeamAndResolveQueue(
          sos.assignedTeamId,
        );
      }
    }

    const updated = await this.sosRepo.update(id, sos);

    // 📡 Realtime: broadcast status change to admin province room
    this.dispatchSocketService.broadcastSosStatusUpdate(updated!.provinceId, {
      sosId: updated!.id,
      status: updated!.status,
      assignedTeamId: updated!.assignedTeamId ?? undefined,
    });

    const statusNote =
      newStatus === SosStatus.RESOLVED
        ? dto.resolutionNotes || 'Yêu cầu cứu hộ đã được giải quyết thành công.'
        : newStatus === SosStatus.ON_SITE
          ? 'Đội cứu hộ đã tiếp cận hiện trường.'
          : newStatus === SosStatus.DISPATCHED
            ? 'Đội cứu hộ đang di chuyển đến hiện trường.'
            : `Trạng thái yêu cầu thay đổi thành: ${newStatus}`;

    await this.logAction('UPDATE_STATUS', id, user.sub, updated!.provinceId, {
      status: newStatus,
      description: statusNote,
    });

    // 📝 History: Ghi nhận thay đổi trạng thái
    const eventType =
      newStatus === SosStatus.RESOLVED
        ? SosHistoryEventType.RESOLVED
        : SosHistoryEventType.STATUS_CHANGED;

    await this.sosHistoryService.record({
      sosRequestId: id,
      eventType,
      fromStatus: oldStatus,
      toStatus: newStatus,
      changedById: user.sub,
      note: statusNote,
    });

    return updated!;
  }

  async assignTeam(
    id: number,
    dto: AssignTeamDto,
    user: AccessTokenPayload,
  ): Promise<SosRequest> {
    const sos = await this.sosRepo.findById(id);
    if (!sos) {
      throw new NotFoundException(`Không tìm thấy yêu cầu SOS với ID ${id}`);
    }

    if (
      sos.status === SosStatus.RESOLVED ||
      sos.status === SosStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Không thể phân công cho yêu cầu SOS đã hoàn thành hoặc đã hủy',
      );
    }

    let teamId = dto.teamId;
    let method = DispatchMethod.MANUAL;
    let autoDispatchOutcome: any = null;

    if (!teamId) {
      // Auto Dispatch via orchestrator
      const outcome = await this.dispatchOrchestrator.dispatch(sos);
      autoDispatchOutcome = outcome;

      if (outcome.type === 'specialist_pending') {
        const updated = await this.sosRepo.findById(id);
        return updated!;
      }

      if (outcome.type === 'queued') {
        const updated = await this.sosRepo.findById(id);
        this.dispatchSocketService.broadcastSosStatusUpdate(sos.provinceId, {
          sosId: sos.id,
          status: SosStatus.PENDING,
        });
        return updated!;
      }

      if (!outcome.assignedTeamId) {
        this.dispatchSocketService.alertNoTeamAvailable(sos.provinceId, sos.id);
        throw new BadRequestException(
          'Không tìm thấy đội cứu hộ nào phù hợp rảnh rỗi hoặc gần đây',
        );
      }

      teamId = outcome.assignedTeamId;
      method = DispatchMethod.AUTO;

      if (outcome.type === 'dual_dispatched' && outcome.secondTeamId) {
        const updated = await this.sosRepo.findById(id);
        if (updated && outcome.etaIdealMinutes !== undefined) {
          updated.etaIdealMinutes = outcome.etaIdealMinutes;
          updated.etaRealisticMinutes = outcome.etaRealisticMinutes;
          updated.trafficDelayMinutes = outcome.trafficDelayMinutes;
          updated.trafficNote = outcome.trafficNote;
        }
        this.dispatchSocketService.broadcastSosStatusUpdate(sos.provinceId, {
          sosId: sos.id,
          status: SosStatus.DISPATCHED,
          assignedTeamId: teamId,
        });
        this.dispatchSocketService.notifyTeamAssigned(teamId, updated!);

        // Notify second team (specialist) queued
        this.dispatchSocketService.notifyTeamAssigned(
          outcome.secondTeamId,
          updated!,
        );
        return updated!;
      }
    } else {
      // Manual Dispatch
      const team = await this.teamRepo.findById(teamId);
      if (!team) {
        throw new NotFoundException(
          `Không tìm thấy đội cứu hộ với ID ${teamId}`,
        );
      }
      if (team.provinceId !== user.provinceId && user.roleId !== 1) {
        throw new BadRequestException(
          'Không thể phân công đội cứu hộ thuộc tỉnh khác',
        );
      }
      if (
        team.status !== TeamStatus.AVAILABLE &&
        team.status !== TeamStatus.STANDBY
      ) {
        throw new BadRequestException(
          `Đội cứu hộ đang ở trạng thái ${team.status}, không thể nhận nhiệm vụ`,
        );
      }

      await this.dispatchOrchestrator.dispatchManual(sos.id, teamId, user.sub);
    }

    const updatedSos = await this.sosRepo.findById(id);
    if (updatedSos && autoDispatchOutcome && autoDispatchOutcome.etaIdealMinutes !== undefined) {
      updatedSos.etaIdealMinutes = autoDispatchOutcome.etaIdealMinutes;
      updatedSos.etaRealisticMinutes = autoDispatchOutcome.etaRealisticMinutes;
      updatedSos.trafficDelayMinutes = autoDispatchOutcome.trafficDelayMinutes;
      updatedSos.trafficNote = autoDispatchOutcome.trafficNote;
    }

    // 📡 Realtime: broadcast assignment to admin province room
    this.dispatchSocketService.broadcastSosStatusUpdate(
      updatedSos!.provinceId,
      {
        sosId: updatedSos!.id,
        status: updatedSos!.status,
        assignedTeamId: teamId,
      },
    );

    // 📡 Realtime: notify the assigned rescue team directly
    this.dispatchSocketService.notifyTeamAssigned(teamId, updatedSos!);

    const teamName = updatedSos!.assignedTeam?.name || `Đội cứu hộ #${teamId}`;
    await this.logAction('ASSIGN_TEAM', id, user.sub, updatedSos!.provinceId, {
      teamId,
      teamName,
      description: `Điều phối viên đã tiếp nhận và phân công đội cứu hộ: ${teamName}`,
    });

    // 📝 History: Ghi nhận phân công đội thủ công
    await this.sosHistoryService.record({
      sosRequestId: id,
      eventType: SosHistoryEventType.TEAM_ASSIGNED,
      fromStatus: SosStatus.PENDING,
      toStatus: SosStatus.DISPATCHED,
      changedById: user.sub,
      teamId,
      dispatchMethod: DispatchMethod.MANUAL,
      note: `Điều phối viên đã tiếp nhận và phân công đội cứu hộ: ${teamName}`,
    });

    return updatedSos!;
  }

  async cancel(
    id: number,
    dto: CancelSosRequestDto,
    user?: AccessTokenPayload,
  ): Promise<SosRequest> {
    const sos = await this.sosRepo.findById(id);
    if (!sos) {
      throw new NotFoundException(`Không tìm thấy yêu cầu SOS với ID ${id}`);
    }

    if (
      sos.status === SosStatus.RESOLVED ||
      sos.status === SosStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Yêu cầu SOS đã hoàn thành hoặc đã hủy trước đó',
      );
    }

    // Role check and status validation
    if (user) {
      if (user.roleId === SystemRoleId.USER) {
        // Resident user
        if (sos.requesterId !== user.sub) {
          throw new BadRequestException(
            'Bạn không có quyền hủy yêu cầu SOS này',
          );
        }
        if (sos.status === SosStatus.ON_SITE) {
          throw new BadRequestException(
            'Đội cứu hộ đã tiếp cận hiện trường, cư dân không thể tự hủy trên ứng dụng',
          );
        }
      }
    } else {
      // Guest cancellation
      if (sos.status === SosStatus.ON_SITE) {
        throw new BadRequestException(
          'Đội cứu hộ đã tiếp cận hiện trường, không thể tự hủy',
        );
      }
    }

    const originalStatus = sos.status;
    sos.status = SosStatus.CANCELLED;
    sos.resolutionNotes = `Hủy yêu cầu: ${dto.reason}`;

    // Release team if assigned and resolve queue
    if (sos.assignedTeamId) {
      await this.dispatchOrchestrator.releaseTeamAndResolveQueue(
        sos.assignedTeamId,
      );
    }

    const updated = await this.sosRepo.update(id, sos);

    // 📡 Realtime: broadcast cancellation to admin province room
    this.dispatchSocketService.broadcastSosStatusUpdate(updated!.provinceId, {
      sosId: updated!.id,
      status: SosStatus.CANCELLED,
    });

    await this.logAction(
      'CANCEL',
      id,
      user ? user.sub : null,
      updated!.provinceId,
      {
        reason: dto.reason,
        description: `Yêu cầu bị hủy. Lý do: ${dto.reason}`,
      },
    );

    // 📝 History: Ghi nhận hủy yêu cầu
    await this.sosHistoryService.record({
      sosRequestId: id,
      eventType: SosHistoryEventType.CANCELLED,
      fromStatus: originalStatus,
      toStatus: SosStatus.CANCELLED,
      changedById: user ? user.sub : null,
      note: `Yêu cầu bị hủy. Lý do: ${dto.reason}`,
    });

    return updated!;
  }

  async findById(id: number): Promise<SosRequest> {
    const sos = await this.sosRepo.findById(id);
    if (!sos) {
      throw new NotFoundException(`Không tìm thấy yêu cầu SOS với ID ${id}`);
    }
    return sos;
  }

  async getTimeline(id: number): Promise<any[]> {
    const sos = await this.sosRepo.findById(id);
    if (!sos) {
      throw new NotFoundException(`Không tìm thấy yêu cầu SOS với ID ${id}`);
    }

    const history = await this.sosHistoryService.getHistory(id);

    if (history.length > 0) {
      const mapped = history.map((entry) => {
        let title = 'Cập nhật hoạt động';

        switch (entry.eventType) {
          case SosHistoryEventType.CREATED:
            title = 'SOS được tạo';
            break;
          case SosHistoryEventType.TEAM_ASSIGNED:
            title = 'Đã tiếp nhận & phân công';
            break;
          case SosHistoryEventType.TEAM_REASSIGNED:
            title = 'Chuyển đội cứu hộ';
            break;
          case SosHistoryEventType.TEAM_RELEASED:
            title = 'Giải phóng đội cứu hộ';
            break;
          case SosHistoryEventType.STATUS_CHANGED: {
            if (entry.toStatus === SosStatus.DISPATCHED) {
              title = 'Đội cứu hộ di chuyển';
            } else if (entry.toStatus === SosStatus.ON_SITE) {
              title = 'Tiếp cận hiện trường';
            } else if (entry.toStatus === SosStatus.PENDING_SPECIALIST) {
              title = 'Chờ đội chuyên môn';
            } else {
              title = 'Cập nhật trạng thái';
            }
            break;
          }
          case SosHistoryEventType.RESOLVED:
            title = 'Đã xử lý xong';
            break;
          case SosHistoryEventType.CANCELLED:
            title = 'Yêu cầu bị hủy';
            break;
          case SosHistoryEventType.QUEUED:
            title = 'Yêu cầu đang chờ đội';
            break;
          case SosHistoryEventType.SPECIALIST_PENDING:
            title = 'Chờ đội chuyên môn';
            break;
        }

        return {
          id: entry.id,
          time: entry.createdAt,
          title,
          desc: entry.note || '',
          eventType: entry.eventType,
          fromStatus: entry.fromStatus,
          toStatus: entry.toStatus,
          teamId: entry.teamId,
          teamName: entry.team?.name || null,
          changedById: entry.changedById,
          changedByName: entry.changedBy?.fullName ?? null,
          dispatchMethod: entry.dispatchMethod,
        };
      });

      // ── Synthesize missing CREATED and TEAM_ASSIGNED events for legacy/seeded data ──
      const hasCreated = mapped.some(
        (item) =>
          (item.eventType as string) ===
          (SosHistoryEventType.CREATED as string),
      );
      if (!hasCreated && sos.createdAt) {
        mapped.unshift({
          id: -1, // Synthetic ID
          time: sos.createdAt,
          title: 'SOS được tạo',
          desc:
            sos.source === SosSource.WEB
              ? 'Khách gửi yêu cầu khẩn cấp qua cổng web.'
              : 'Người dùng gửi yêu cầu khẩn cấp qua ứng dụng di động.',
          eventType: SosHistoryEventType.CREATED,
          fromStatus: null,
          toStatus: SosStatus.PENDING,
          teamId: null,
          teamName: null,
          changedById: sos.requesterId ?? null,
          changedByName: sos.requesterName ?? null,
          dispatchMethod: null,
        });
      }

      const hasAssigned = mapped.some(
        (item) =>
          (item.eventType as string) ===
            (SosHistoryEventType.TEAM_ASSIGNED as string) ||
          (item.eventType as string) ===
            (SosHistoryEventType.TEAM_REASSIGNED as string),
      );
      if (!hasAssigned && (sos.assignedTeamId || sos.assignedAt)) {
        const assignTime = sos.assignedAt || sos.createdAt;
        const insertIndex = mapped.findIndex(
          (item) =>
            new Date(item.time).getTime() > new Date(assignTime).getTime(),
        );

        const assignedItem = {
          id: -2, // Synthetic ID
          time: assignTime,
          title: 'Đã tiếp nhận & phân công',
          desc: sos.assignedTeam
            ? `Điều phối viên đã phân công đội cứu hộ: ${sos.assignedTeam.name}`
            : 'Điều phối viên đã tiếp nhận và phân công.',
          eventType: SosHistoryEventType.TEAM_ASSIGNED,
          fromStatus: SosStatus.PENDING,
          toStatus: SosStatus.DISPATCHED,
          teamId: sos.assignedTeamId ?? null,
          teamName: sos.assignedTeam?.name || null,
          changedById: sos.assignedBy ?? null,
          changedByName: sos.assigner?.fullName ?? null,
          dispatchMethod: sos.dispatchMethod ?? null,
        };

        if (insertIndex === -1) {
          mapped.push(assignedItem);
        } else {
          mapped.splice(insertIndex, 0, assignedItem);
        }
      }

      // Sort chronological to be absolutely sure
      mapped.sort(
        (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
      );

      return mapped;
    }

    // Fallback: nếu chưa có data history (SOS cũ), suy diễn từ audit log
    const logs = await this.auditLogRepo.find({
      where: { resourceType: 'SosRequest', resourceId: id },
      order: { createdAt: 'ASC' },
    });

    if (logs.length === 0) {
      const sos = await this.sosRepo.findById(id);
      if (!sos) {
        throw new NotFoundException(`Không tìm thấy yêu cầu SOS với ID ${id}`);
      }
      const timeline: any[] = [];
      if (sos.createdAt) {
        timeline.push({
          time: sos.createdAt,
          title: 'SOS được tạo',
          desc: 'Người dùng gửi yêu cầu khẩn cấp qua hệ thống.',
          eventType: SosHistoryEventType.CREATED,
        });
      }
      if (sos.assignedAt) {
        timeline.push({
          time: sos.assignedAt,
          title: 'Đã tiếp nhận & phân công',
          desc: sos.assignedTeam
            ? `Điều phối viên đã phân công đội cứu hộ: ${sos.assignedTeam.name}`
            : 'Điều phối viên đã tiếp nhận và phân công.',
          eventType: SosHistoryEventType.TEAM_ASSIGNED,
          teamName: sos.assignedTeam?.name || null,
        });
      }
      if (sos.status === SosStatus.ON_SITE) {
        timeline.push({
          time: sos.updatedAt,
          title: 'Tiếp cận hiện trường',
          desc: 'Đội cứu hộ đã tiếp cận hiện trường.',
          eventType: SosHistoryEventType.STATUS_CHANGED,
          toStatus: SosStatus.ON_SITE,
        });
      }
      if (sos.resolvedAt) {
        timeline.push({
          time: sos.resolvedAt,
          title: 'Đã xử lý xong',
          desc:
            sos.resolutionNotes ||
            'Yêu cầu cứu hộ đã được giải quyết thành công.',
          eventType: SosHistoryEventType.RESOLVED,
          toStatus: SosStatus.RESOLVED,
        });
      } else if (sos.status === SosStatus.CANCELLED) {
        timeline.push({
          time: sos.updatedAt,
          title: 'Yêu cầu bị hủy',
          desc: sos.resolutionNotes || 'Yêu cầu SOS đã bị hủy.',
          eventType: SosHistoryEventType.CANCELLED,
          toStatus: SosStatus.CANCELLED,
        });
      }
      return timeline;
    }

    return logs.map((log) => {
      let title = 'Cập nhật hoạt động';
      const desc = log.metadata?.description || '';

      switch (log.action) {
        case 'CREATE':
          title = 'SOS được tạo';
          break;
        case 'ASSIGN_TEAM':
          title = 'Đã tiếp nhận & phân công';
          break;
        case 'UPDATE_STATUS': {
          const status = log.metadata?.status;
          if (status === SosStatus.DISPATCHED) {
            title = 'Đội cứu hộ di chuyển';
          } else if (status === SosStatus.ON_SITE) {
            title = 'Tiếp cận hiện trường';
          } else if (status === SosStatus.RESOLVED) {
            title = 'Đã xử lý xong';
          } else {
            title = 'Cập nhật trạng thái';
          }
          break;
        }
        case 'CANCEL':
          title = 'Yêu cầu bị hủy';
          break;
      }

      return {
        time: log.createdAt,
        title,
        desc,
      };
    });
  }
}
