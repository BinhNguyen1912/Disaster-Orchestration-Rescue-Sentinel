import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { DataSource, Repository, MoreThan, EntityManager } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { FloodRequestEntity } from '@infrastructure/database/entities/flood-request.entity';
import { FloodRequestStatusHistoryEntity } from '@infrastructure/database/entities/flood-request-status-history.entity';
import { AuditLogEntity } from '@infrastructure/database/entities/audit-log.entity';
import { SosRequestEntity } from '@infrastructure/database/entities/sos-request.entity';
import { SosStatusHistoryEntity, SosHistoryEventType } from '@infrastructure/database/entities/sos-status-history.entity';
import type { IFloodRequestRepository, QueryFloodRequestParams } from '../../domain/repositories/flood-request.repository.interface';
import { FloodRequest } from '../../domain/entities/flood-request.interface';
import { CreateFloodRequestValidationDto } from '../../presentation/dtos/create-flood-request.validation.dto';
import { QueryFloodRequestValidationDto } from '../../presentation/dtos/query-flood-request.validation.dto';
import { UpdateFloodRequestStatusValidationDto } from '../../presentation/dtos/update-flood-request-status.validation.dto';
import { DispatchFloodRequestValidationDto } from '../../presentation/dtos/dispatch-flood-request.validation.dto';
import { AccessTokenPayload } from '../../../auth/domain/interfaces/jwt-payload.interface';
import { FloodRequestStatus } from '@shared/core/enums/floodRequestStatus.enum';
import { FloodRequestPurpose } from '@shared/core/enums/floodRequestPurpose.enum';
import { DispatchMethod } from '@shared/core/enums/dispatchMethod.enum';
import { SosStatus } from '@shared/core/enums/sosStatus.enum';
import { SosSource } from '@shared/core/enums/sosSource.enum';
import { SosRequestType } from '@shared/core/enums/sosType.enum';
import { SystemRoleId } from '@shared/common/constants/permissions.constant';
import { PaginatedResult } from '@shared/common/dtos/pagination.dto';
import { LocationService } from '../../../location/application/services/location.service';
import { DispatchSocketService } from '../../../websocket/services/dispatch-socket.service';
import { DispatchOrchestratorService } from '../../../sos-request/application/services/dispatch-orchestrator.service';

@Injectable()
export class FloodRequestService {
  constructor(
    @Inject('IFloodRequestRepository')
    private readonly repo: IFloodRequestRepository,
    @InjectRepository(AuditLogEntity)
    private readonly auditLogRepo: Repository<AuditLogEntity>,
    @InjectRepository(FloodRequestStatusHistoryEntity)
    private readonly statusHistoryRepo: Repository<FloodRequestStatusHistoryEntity>,
    private readonly locationService: LocationService,
    private readonly dispatchSocketService: DispatchSocketService,
    private readonly dispatchOrchestrator: DispatchOrchestratorService,
    private readonly dataSource: DataSource,
  ) {}

  private async logAction(
    action: string,
    floodRequestId: number,
    userId: number | null,
    provinceId: number,
    metadata: any,
  ) {
    try {
      const log = this.auditLogRepo.create({
        action,
        resourceType: 'FloodRequest',
        resourceId: floodRequestId,
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
    dto: CreateFloodRequestValidationDto,
    user?: AccessTokenPayload,
  ): Promise<FloodRequest> {
    // 1. Phone-based Rate Limiting: max 1 request per 2 minutes per phone
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const recentRequest = await this.repo.findAll({
      where: {
        requesterPhone: dto.requesterPhone,
        createdAt: MoreThan(twoMinutesAgo),
      },
    });

    if (recentRequest && recentRequest.length > 0) {
      throw new HttpException(
        'Vui lòng đợi 2 phút trước khi gửi yêu cầu tiếp theo với số điện thoại này.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 2. Resolve locations if not provided
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

    const floodData: Partial<FloodRequest> = {
      title: dto.title,
      description: dto.description || '',
      requesterId: user ? user.sub : null,
      requesterName: dto.requesterName,
      requesterPhone: dto.requesterPhone,
      location: {
        type: 'Point',
        coordinates: [dto.longitude, dto.latitude],
      },
      provinceId,
      adminUnitId,
      locationName: dto.locationName || '',
      addressDetail: dto.addressDetail || '',
      severity: dto.severity,
      floodDepthCmMin: dto.floodDepthCmMin || null,
      floodDepthCmMax: dto.floodDepthCmMax || null,
      estimatedAreaHa: dto.estimatedAreaHa || null,
      roadType: dto.roadType || '',
      impact: dto.impact || '',
      weather: dto.weather || '',
      notes: dto.notes || '',
      imageUrls: dto.imageUrls || [],
      purpose: dto.purpose,
      status: FloodRequestStatus.PENDING,
      isApprovedForMap: false,
      source: user ? SosSource.APP : SosSource.WEB,
      deviceInfo: dto.deviceInfo || '',
    };

    const created = await this.repo.create(floodData);

    // Save history
    const history = this.statusHistoryRepo.create({
      floodRequestId: created.id,
      fromStatus: null,
      toStatus: FloodRequestStatus.PENDING,
      changedBy: user ? user.sub : null,
      note: user ? 'Gửi từ tài khoản ứng dụng di động' : 'Khách gửi ẩn danh từ cổng web',
    });
    await this.statusHistoryRepo.save(history);

    // Write audit log
    await this.logAction('CREATE', created.id, user ? user.sub : null, created.provinceId, {
      purpose: created.purpose,
      description: 'Tạo yêu cầu báo ngập lụt.',
    });

    // Notify province admins
    this.dispatchSocketService.broadcastNewFloodRequest(created.provinceId, created);

    // Return the formatted object with lat/lng
    return this.repo.findById(created.id) as any;
  }

  async findAll(
    dto: QueryFloodRequestValidationDto,
    user: AccessTokenPayload,
  ): Promise<PaginatedResult<FloodRequest>> {
    const filters: QueryFloodRequestParams = { ...dto };

    // Tenant scoping
    if (user.roleId !== SystemRoleId.SYSTEM_ADMIN) {
      filters.provinceId = user.provinceId;
    }

    // Resident filter
    if (user.roleId === SystemRoleId.USER) {
      filters.requesterId = user.sub;
    }

    const page = dto.page || 1;
    const limit = dto.limit || 20;

    return this.repo.findAllPaginated(filters, { page, limit });
  }

  async findById(id: number): Promise<FloodRequest> {
    const fr = await this.repo.findById(id);
    if (!fr) {
      throw new NotFoundException(`Không tìm thấy yêu cầu báo ngập lụt với ID ${id}`);
    }
    return fr;
  }

  async updateStatus(
    id: number,
    dto: UpdateFloodRequestStatusValidationDto,
    user: AccessTokenPayload,
  ): Promise<FloodRequest> {
    const fr = await this.repo.findById(id);
    if (!fr) {
      throw new NotFoundException(`Không tìm thấy yêu cầu báo ngập lụt với ID ${id}`);
    }

    const oldStatus = fr.status;
    const newStatus = dto.status;

    // Enforce logic: can't change completed or rejected requests status
    if (oldStatus === FloodRequestStatus.APPROVED || oldStatus === FloodRequestStatus.DISPATCHED) {
      throw new BadRequestException('Không thể thay đổi trạng thái của yêu cầu đã được duyệt hoặc điều phối');
    }

    // Transition constraints: REJECTED requires it to currently be in VERIFYING or PENDING?
    // Wait, the user said: "Nhưng nếu request đang ở REJECTED hoặc PENDING (chưa qua VERIFYING), admin vẫn có thể gọi approve-map hoặc dispatch được không? Nên khóa rõ: chỉ cho phép hai action này khi status === VERIFYING"
    // For general status change (to VERIFYING or REJECTED):
    // From PENDING/VERIFYING to REJECTED is fine.
    // From PENDING to VERIFYING is fine.
    
    fr.status = newStatus;
    fr.reviewedBy = user.sub;
    fr.reviewedAt = new Date();
    if (dto.reviewNotes) {
      fr.reviewNotes = dto.reviewNotes;
    }

    const updated = await this.repo.update(id, fr);

    // Save history
    const history = this.statusHistoryRepo.create({
      floodRequestId: id,
      fromStatus: oldStatus,
      toStatus: newStatus,
      changedBy: user.sub,
      note: dto.reviewNotes || `Cập nhật trạng thái sang ${newStatus}`,
    });
    await this.statusHistoryRepo.save(history);

    // Write audit log
    await this.logAction('UPDATE_STATUS', id, user.sub, updated!.provinceId, {
      fromStatus: oldStatus,
      toStatus: newStatus,
      notes: dto.reviewNotes,
    });

    // Notify socket
    this.dispatchSocketService.broadcastNewFloodRequest(updated!.provinceId, updated);

    return updated!;
  }

  async approveMap(id: number, user: AccessTokenPayload): Promise<FloodRequest> {
    const fr = await this.repo.findById(id);
    if (!fr) {
      throw new NotFoundException(`Không tìm thấy yêu cầu báo ngập lụt với ID ${id}`);
    }

    if (fr.purpose !== FloodRequestPurpose.DECLARE_ONLY) {
      throw new BadRequestException('Chỉ có thể duyệt lên bản đồ các yêu cầu khai báo (DECLARE_ONLY)');
    }

    // Force constraints: only allow approve-map if current status is VERIFYING
    if (fr.status !== FloodRequestStatus.VERIFYING) {
      throw new BadRequestException('Chỉ có thể duyệt lên bản đồ khi yêu cầu đang ở trạng thái VERIFYING');
    }

    const oldStatus = fr.status;

    fr.isApprovedForMap = true;
    fr.status = FloodRequestStatus.APPROVED;
    fr.reviewedBy = user.sub;
    fr.reviewedAt = new Date();

    const updated = await this.repo.update(id, fr);

    // Save history
    const history = this.statusHistoryRepo.create({
      floodRequestId: id,
      fromStatus: oldStatus,
      toStatus: FloodRequestStatus.APPROVED,
      changedBy: user.sub,
      note: 'Phê duyệt hiển thị trên bản đồ công cộng',
    });
    await this.statusHistoryRepo.save(history);

    // Write audit log
    await this.logAction('APPROVE_MAP', id, user.sub, updated!.provinceId, {
      description: 'Duyệt hiển thị điểm ngập lụt trên bản đồ.',
    });

    // Notify socket
    this.dispatchSocketService.broadcastNewFloodRequest(updated!.provinceId, updated);

    return updated!;
  }

  async dispatch(
    id: number,
    dto: DispatchFloodRequestValidationDto,
    user: AccessTokenPayload,
  ): Promise<FloodRequest> {
    return await this.dataSource.transaction(async (manager) => {
      // 1. SELECT FOR UPDATE to prevent race conditions
      const floodRequest = await manager.findOne(FloodRequestEntity, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!floodRequest) {
        throw new NotFoundException(`Không tìm thấy yêu cầu báo ngập lụt với ID ${id}`);
      }

      // 2. Validate purpose
      if (floodRequest.purpose !== FloodRequestPurpose.REQUEST_SUPPORT) {
        throw new BadRequestException('Chỉ có thể điều phối cho yêu cầu cần hỗ trợ (REQUEST_SUPPORT)');
      }

      // 3. Validate status: strictly must be VERIFYING
      if (floodRequest.status !== FloodRequestStatus.VERIFYING) {
        throw new BadRequestException('Chỉ có thể điều phối khi yêu cầu đang ở trạng thái VERIFYING');
      }

      const oldStatus = floodRequest.status;

      // 4. Create SOS request manually inside the transaction
      const sosData: Partial<SosRequestEntity> = {
        provinceId: floodRequest.provinceId,
        adminUnitId: floodRequest.adminUnitId,
        requesterId: floodRequest.requesterId || undefined,
        requesterName: floodRequest.requesterName,
        requesterPhone: floodRequest.requesterPhone,
        location: floodRequest.location,
        requestType: SosRequestType.FLOOD,
        status: SosStatus.PENDING,
        severity: floodRequest.severity,
        trappedPeopleCount: 1,
        specialNeedsTags: [],
        imageUrls: floodRequest.imageUrls || [],
        description: floodRequest.description || floodRequest.title,
        source: floodRequest.source,
        requiresEquipment: false,
      };

      const sosEntity = manager.create(SosRequestEntity, sosData);
      const savedSos = await manager.save(SosRequestEntity, sosEntity);

      // Log SOS action in audit log
      const sosLog = manager.create(AuditLogEntity, {
        action: 'CREATE',
        resourceType: 'SosRequest',
        resourceId: savedSos.id,
        userId: user.sub,
        provinceId: savedSos.provinceId,
        metadata: { description: `Tạo tự động từ yêu cầu báo lũ lụt #${floodRequest.id}` },
      });
      await manager.save(AuditLogEntity, sosLog);

      // Record SOS History
      const sosHistory = manager.create(SosStatusHistoryEntity, {
        sosRequestId: savedSos.id,
        eventType: SosHistoryEventType.CREATED,
        toStatus: SosStatus.PENDING,
        changedById: user.sub,
        note: `Tạo tự động từ yêu cầu cứu trợ báo lũ lụt #${floodRequest.id}`,
      });
      await manager.save(SosStatusHistoryEntity, sosHistory);

      // 5. Call DispatchOrchestratorService forwarding transaction manager
      let outcome;
      let teamId: number | null = null;
      if (dto.method === DispatchMethod.AUTO) {
        outcome = await this.dispatchOrchestrator.dispatch(savedSos as any, manager);
        teamId = outcome.assignedTeamId || null;
      } else {
        if (!dto.teamId) {
          throw new BadRequestException('ID Đội cứu hộ là bắt buộc khi chọn điều phối thủ công');
        }
        outcome = await this.dispatchOrchestrator.dispatchManual(savedSos.id, dto.teamId, user.sub, manager);
        teamId = dto.teamId;
      }

      // 6. Update FloodRequest
      floodRequest.status = FloodRequestStatus.DISPATCHED;
      floodRequest.linkedSosId = savedSos.id;
      floodRequest.dispatchMethod = dto.method;
      floodRequest.reviewedBy = user.sub;
      floodRequest.reviewedAt = new Date();
      if (dto.reviewNotes) {
        floodRequest.reviewNotes = dto.reviewNotes;
      }
      const updatedFr = await manager.save(FloodRequestEntity, floodRequest);

      // 7. Write history log row for FloodRequest
      const floodHistory = manager.create(FloodRequestStatusHistoryEntity, {
        floodRequestId: floodRequest.id,
        fromStatus: oldStatus,
        toStatus: FloodRequestStatus.DISPATCHED,
        changedBy: user.sub,
        note: dto.reviewNotes || `Đã điều phối SOS (Phương thức: ${dto.method})`,
        sosId: savedSos.id,
        rescueTeamId: teamId || undefined,
      });
      await manager.save(FloodRequestStatusHistoryEntity, floodHistory);

      // Write FloodRequest audit log
      const frLog = manager.create(AuditLogEntity, {
        action: 'DISPATCH',
        resourceType: 'FloodRequest',
        resourceId: floodRequest.id,
        userId: user.sub,
        provinceId: floodRequest.provinceId,
        metadata: {
          sosId: savedSos.id,
          method: dto.method,
          teamId,
          notes: dto.reviewNotes,
        },
      });
      await manager.save(AuditLogEntity, frLog);

      // Broadcast Socket Update for Flood Request
      this.dispatchSocketService.broadcastNewFloodRequest(updatedFr.provinceId, updatedFr);

      // Broadcast Socket Update for SOS status
      const updatedSos = await manager.findOne(SosRequestEntity, { where: { id: savedSos.id } });
      if (updatedSos) {
        this.dispatchSocketService.broadcastSosStatusUpdate(updatedSos.provinceId, {
          sosId: updatedSos.id,
          status: updatedSos.status,
          assignedTeamId: updatedSos.assignedTeamId ?? undefined,
        });
        if (updatedSos.assignedTeamId) {
          this.dispatchSocketService.notifyTeamAssigned(updatedSos.assignedTeamId, updatedSos);
        }
      }

      return updatedFr as any;
    });
  }

  async track(phone: string, id: number): Promise<FloodRequest> {
    if (!phone || !id) {
      throw new BadRequestException('Số điện thoại và Mã yêu cầu là bắt buộc để tra cứu');
    }

    const fr = await this.repo.findById(id);
    if (!fr || fr.requesterPhone !== phone) {
      throw new NotFoundException('Không tìm thấy yêu cầu báo lụt nào khớp với thông tin tra cứu');
    }

    return fr;
  }

  async getHistory(id: number): Promise<any[]> {
    const fr = await this.repo.findById(id);
    if (!fr) {
      throw new NotFoundException(`Không tìm thấy yêu cầu báo ngập lụt với ID ${id}`);
    }

    const history = await this.statusHistoryRepo.find({
      where: { floodRequestId: id },
      relations: ['changer', 'sos', 'rescueTeam'],
      order: { changedAt: 'ASC' },
    });

    return history.map((entry) => ({
      id: entry.id,
      time: entry.changedAt,
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      changedBy: entry.changer ? entry.changer.fullName : 'Hệ thống',
      note: entry.note || '',
      sosId: entry.sosId || null,
      rescueTeamName: entry.rescueTeam ? entry.rescueTeam.name : null,
    }));
  }
}
