import {
  BadRequestException,
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common';
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
import { DispatchSocketService } from '../../../websocket/services/dispatch-socket.service';
import { DispatchOrchestratorService } from './dispatch-orchestrator.service';

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
  ) {}

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
        provinceId = provinceId || 1;
        adminUnitId = adminUnitId || 1;
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

    // 📡 Realtime: Notify admins in the same province about the new SOS request
    this.dispatchSocketService.broadcastNewSos(created.provinceId, created);

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

    if (!teamId) {
      // Auto Dispatch via orchestrator
      const outcome = await this.dispatchOrchestrator.dispatch(sos);

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

    return updated!;
  }
}
