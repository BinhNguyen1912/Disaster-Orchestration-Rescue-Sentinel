import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository, EntityManager } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { FloodRequestService } from './flood-request.service';
import { FloodRequestEntity } from '../../../../infrastructure/database/entities/flood-request.entity';
import { FloodRequestStatusHistoryEntity } from '../../../../infrastructure/database/entities/flood-request-status-history.entity';
import { AuditLogEntity } from '../../../../infrastructure/database/entities/audit-log.entity';
import { SosRequestEntity } from '../../../../infrastructure/database/entities/sos-request.entity';
import { SosStatusHistoryEntity } from '../../../../infrastructure/database/entities/sos-status-history.entity';

import { LocationService } from '../../../location/application/services/location.service';
import { DispatchSocketService } from '../../../websocket/services/dispatch-socket.service';
import { DispatchOrchestratorService } from '../../../sos-request/application/services/dispatch-orchestrator.service';
import { RedisService } from '../../../../infrastructure/redis/redis.service';

import { FloodRequestStatus } from '@shared/core/enums/floodRequestStatus.enum';
import { FloodRequestPurpose } from '@shared/core/enums/floodRequestPurpose.enum';
import { DispatchMethod } from '@shared/core/enums/dispatchMethod.enum';
import { Severity } from '@shared/core/enums/level.enum';
import { SystemRoleId } from '@shared/common/constants/permissions.constant';

describe('FloodRequestService', () => {
  let service: FloodRequestService;

  const mockRepo = {
    create: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    findAllPaginated: jest.fn(),
  };

  const mockAuditLogRepo = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockStatusHistoryRepo = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockLocationService = {
    findUnitByCoordinates: jest.fn(),
    findFirstUnit: jest.fn(),
  };

  const mockDispatchSocketService = {
    broadcastNewFloodRequest: jest.fn(),
    broadcastSosStatusUpdate: jest.fn(),
    notifyTeamAssigned: jest.fn(),
  };

  const mockDispatchOrchestrator = {
    dispatch: jest.fn(),
    dispatchManual: jest.fn(),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key, def) => def),
  };

  // Mock TypeORM DataSource
  const mockEntityManager = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn((cb) => cb(mockEntityManager)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FloodRequestService,
        { provide: 'IFloodRequestRepository', useValue: mockRepo },
        { provide: getRepositoryToken(AuditLogEntity), useValue: mockAuditLogRepo },
        { provide: getRepositoryToken(FloodRequestStatusHistoryEntity), useValue: mockStatusHistoryRepo },
        { provide: LocationService, useValue: mockLocationService },
        { provide: DispatchSocketService, useValue: mockDispatchSocketService },
        { provide: DispatchOrchestratorService, useValue: mockDispatchOrchestrator },
        { provide: RedisService, useValue: mockRedisService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<FloodRequestService>(FloodRequestService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      title: 'Ngập đường Lê Lợi',
      requesterName: 'Nguyễn Văn A',
      requesterPhone: '0987654321',
      latitude: 10.7,
      longitude: 106.6,
      severity: Severity.HIGH,
      purpose: FloodRequestPurpose.REQUEST_SUPPORT,
    };

    it('should throw HttpException 429 when rate limited', async () => {
      mockRedisService.get.mockResolvedValue('1');

      await expect(service.create(createDto)).rejects.toThrow(
        new HttpException(
          'Vui lòng đợi 2 phút trước khi gửi yêu cầu tiếp theo với số điện thoại này.',
          HttpStatus.TOO_MANY_REQUESTS,
        ),
      );
      expect(mockRedisService.get).toHaveBeenCalledWith('rate-limit:flood-request:phone:0987654321');
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('should resolve location and create flood request when rate limit passes', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockLocationService.findUnitByCoordinates.mockResolvedValue({
        provinceId: 2,
        id: 20,
      });
      mockRepo.create.mockResolvedValue({
        id: 1,
        ...createDto,
        provinceId: 2,
        adminUnitId: 20,
      });
      mockRepo.findById.mockResolvedValue({
        id: 1,
        ...createDto,
        provinceId: 2,
        adminUnitId: 20,
      });

      const result = await service.create(createDto);

      expect(result.id).toBe(1);
      expect(mockRedisService.set).toHaveBeenCalledWith('rate-limit:flood-request:phone:0987654321', '1', 120);
      expect(mockLocationService.findUnitByCoordinates).toHaveBeenCalledWith(10.7, 106.6);
      expect(mockRepo.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    const queryDto = { page: 1, limit: 10 };

    it('should scope by user sub ID when role is resident user', async () => {
      const user = { sub: 100, roleId: SystemRoleId.USER, provinceId: 1 };
      mockRepo.findAllPaginated.mockResolvedValue({ items: [], total: 0 });

      await service.findAll(queryDto, user);

      expect(mockRepo.findAllPaginated).toHaveBeenCalledWith(
        expect.objectContaining({ requesterId: 100 }),
        { page: 1, limit: 10 },
      );
    });

    it('should scope by provinceId when role is province admin', async () => {
      const user = { sub: 5, roleId: SystemRoleId.PROVINCE_ADMIN, provinceId: 12 };
      mockRepo.findAllPaginated.mockResolvedValue({ items: [], total: 0 });

      await service.findAll(queryDto, user);

      expect(mockRepo.findAllPaginated).toHaveBeenCalledWith(
        expect.objectContaining({ provinceId: 12 }),
        { page: 1, limit: 10 },
      );
    });

    it('should not scope when role is system admin', async () => {
      const user = { sub: 1, roleId: SystemRoleId.SYSTEM_ADMIN, provinceId: 12 };
      mockRepo.findAllPaginated.mockResolvedValue({ items: [], total: 0 });

      await service.findAll(queryDto, user);

      expect(mockRepo.findAllPaginated).toHaveBeenCalledWith(
        expect.not.objectContaining({ provinceId: 12, requesterId: 1 }),
        { page: 1, limit: 10 },
      );
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException when request not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
    });

    it('should return request when found', async () => {
      mockRepo.findById.mockResolvedValue({ id: 1, title: 'Test' });

      const result = await service.findById(1);
      expect(result.id).toBe(1);
    });
  });

  describe('updateStatus', () => {
    it('should throw BadRequestException when changing status of a finished/dispatched request', async () => {
      const user = { sub: 1, roleId: SystemRoleId.PROVINCE_ADMIN, provinceId: 2 };
      mockRepo.findById.mockResolvedValue({ id: 1, status: FloodRequestStatus.DISPATCHED });

      await expect(
        service.updateStatus(1, { status: FloodRequestStatus.VERIFYING }, user),
      ).rejects.toThrow(
        new BadRequestException('Không thể thay đổi trạng thái của yêu cầu đã được duyệt hoặc điều phối'),
      );
    });

    it('should successfully update status and log history for valid transition', async () => {
      const user = { sub: 1, roleId: SystemRoleId.PROVINCE_ADMIN, provinceId: 2 };
      mockRepo.findById.mockResolvedValue({ id: 1, status: FloodRequestStatus.PENDING, provinceId: 2 });
      mockRepo.update.mockResolvedValue({ id: 1, status: FloodRequestStatus.VERIFYING, provinceId: 2 });

      const result = await service.updateStatus(1, { status: FloodRequestStatus.VERIFYING, reviewNotes: 'Verified!' }, user);

      expect(result.status).toBe(FloodRequestStatus.VERIFYING);
      expect(mockStatusHistoryRepo.save).toHaveBeenCalled();
      expect(mockAuditLogRepo.save).toHaveBeenCalled();
    });
  });

  describe('approveMap', () => {
    const user = { sub: 1, roleId: SystemRoleId.PROVINCE_ADMIN, provinceId: 2 };

    it('should throw BadRequestException if purpose is not DECLARE_ONLY', async () => {
      mockRepo.findById.mockResolvedValue({ id: 1, purpose: FloodRequestPurpose.REQUEST_SUPPORT, status: FloodRequestStatus.VERIFYING });

      await expect(service.approveMap(1, user)).rejects.toThrow(
        new BadRequestException('Chỉ có thể duyệt lên bản đồ các yêu cầu khai báo (DECLARE_ONLY)'),
      );
    });

    it('should throw BadRequestException if status is not VERIFYING', async () => {
      mockRepo.findById.mockResolvedValue({ id: 1, purpose: FloodRequestPurpose.DECLARE_ONLY, status: FloodRequestStatus.PENDING });

      await expect(service.approveMap(1, user)).rejects.toThrow(
        new BadRequestException('Chỉ có thể duyệt lên bản đồ khi yêu cầu đang ở trạng thái VERIFYING'),
      );
    });

    it('should approve map, set approved to true, status to APPROVED', async () => {
      mockRepo.findById.mockResolvedValue({ id: 1, purpose: FloodRequestPurpose.DECLARE_ONLY, status: FloodRequestStatus.VERIFYING, provinceId: 2 });
      mockRepo.update.mockResolvedValue({ id: 1, isApprovedForMap: true, status: FloodRequestStatus.APPROVED, provinceId: 2 });

      const result = await service.approveMap(1, user);

      expect(result.status).toBe(FloodRequestStatus.APPROVED);
      expect(result.isApprovedForMap).toBe(true);
      expect(mockStatusHistoryRepo.save).toHaveBeenCalled();
    });
  });

  describe('dispatch', () => {
    const user = { sub: 1, roleId: SystemRoleId.PROVINCE_ADMIN, provinceId: 2 };

    it('should throw NotFoundException if flood request is not found', async () => {
      mockEntityManager.findOne.mockResolvedValue(null);

      await expect(
        service.dispatch(999, { method: DispatchMethod.AUTO }, user),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if purpose is not REQUEST_SUPPORT', async () => {
      mockEntityManager.findOne.mockResolvedValue({
        id: 1,
        purpose: FloodRequestPurpose.DECLARE_ONLY,
        status: FloodRequestStatus.VERIFYING,
      });

      await expect(
        service.dispatch(1, { method: DispatchMethod.AUTO }, user),
      ).rejects.toThrow(
        new BadRequestException('Chỉ có thể điều phối cho yêu cầu cần hỗ trợ (REQUEST_SUPPORT)'),
      );
    });

    it('should throw BadRequestException if status is not VERIFYING', async () => {
      mockEntityManager.findOne.mockResolvedValue({
        id: 1,
        purpose: FloodRequestPurpose.REQUEST_SUPPORT,
        status: FloodRequestStatus.PENDING,
      });

      await expect(
        service.dispatch(1, { method: DispatchMethod.AUTO }, user),
      ).rejects.toThrow(
        new BadRequestException('Chỉ có thể điều phối khi yêu cầu đang ở trạng thái VERIFYING'),
      );
    });

    it('should throw BadRequestException on manual dispatch if teamId is missing', async () => {
      mockEntityManager.findOne.mockResolvedValue({
        id: 1,
        purpose: FloodRequestPurpose.REQUEST_SUPPORT,
        status: FloodRequestStatus.VERIFYING,
      });

      await expect(
        service.dispatch(1, { method: DispatchMethod.MANUAL }, user),
      ).rejects.toThrow(
        new BadRequestException('ID Đội cứu hộ là bắt buộc khi chọn điều phối thủ công'),
      );
    });

    it('should auto dispatch successfully using orchestrator, create SOS and change status to DISPATCHED', async () => {
      const mockFlood = {
        id: 1,
        purpose: FloodRequestPurpose.REQUEST_SUPPORT,
        status: FloodRequestStatus.VERIFYING,
        provinceId: 2,
        adminUnitId: 22,
        location: { type: 'Point', coordinates: [106.6, 10.7] },
        severity: Severity.HIGH,
        imageUrls: [],
        source: 'WEB',
      };

      mockEntityManager.findOne.mockImplementation((entityClass, query) => {
        if (entityClass === FloodRequestEntity) return Promise.resolve(mockFlood);
        if (entityClass === SosRequestEntity) return Promise.resolve({ id: 99, status: 'PENDING', provinceId: 2 });
        return Promise.resolve(null);
      });

      mockEntityManager.create.mockImplementation((entityClass, data) => data);
      mockEntityManager.save.mockImplementation((entityClass, data) => Promise.resolve({ id: 99, ...data }));

      mockDispatchOrchestrator.dispatch.mockResolvedValue({
        type: 'dispatched',
        assignedTeamId: 15,
      });

      const result = await service.dispatch(1, { method: DispatchMethod.AUTO }, user);

      expect(result.status).toBe(FloodRequestStatus.DISPATCHED);
      expect(result.linkedSosId).toBe(99);
      expect(mockDispatchOrchestrator.dispatch).toHaveBeenCalled();
    });
  });

  describe('track', () => {
    it('should throw BadRequestException if phone or id is missing', async () => {
      await expect(service.track('', 1)).rejects.toThrow(BadRequestException);
      await expect(service.track('0987654321', 0)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if phone mismatches or request is missing', async () => {
      mockRepo.findById.mockResolvedValue({ id: 1, requesterPhone: '0987654321' });

      await expect(service.track('0900000000', 1)).rejects.toThrow(NotFoundException);
    });

    it('should return request if phone matches', async () => {
      mockRepo.findById.mockResolvedValue({ id: 1, requesterPhone: '0987654321' });

      const result = await service.track('0987654321', 1);
      expect(result.id).toBe(1);
    });
  });
});
