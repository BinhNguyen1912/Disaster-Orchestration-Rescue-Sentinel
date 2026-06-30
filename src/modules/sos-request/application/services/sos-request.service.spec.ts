import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SosRequestService } from './sos-request.service';
import { SosStatus } from '@shared/core/enums/sosStatus.enum';
import { TeamStatus } from '@shared/core/enums/teamStatus.enum';
import { Severity } from '@shared/core/enums/level.enum';
import { SosRequestType } from '@shared/core/enums/sosType.enum';
import { SosSource } from '@shared/core/enums/sosSource.enum';
import { DispatchMethod } from '@shared/core/enums/dispatchMethod.enum';
import { SystemRoleId } from '@shared/common/constants/permissions.constant';
import { LocationService } from '../../../location/application/services/location.service';
import { DispatchSocketService } from '../../../websocket/services/dispatch-socket.service';
import { DispatchOrchestratorService } from './dispatch-orchestrator.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditLogEntity } from '@infrastructure/database/entities/audit-log.entity';
import { SosHistoryService } from './sos-history.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('SosRequestService', () => {
  let service: SosRequestService;

  const mockSosRepo = {
    create: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findAndCount: jest.fn(),
    findNearby: jest.fn(),
    findAllPaginated: jest.fn(),
  };

  const mockTeamRepo = {
    findById: jest.fn(),
    update: jest.fn(),
    findNearestAvailable: jest.fn(),
  };

  const mockDispatchStrategy = {
    assignTeam: jest.fn(),
  };

  const mockLocationService = {
    findUnitByCoordinates: jest.fn(),
  };

  const mockDispatchSocketService = {
    broadcastNewSos: jest.fn(),
    broadcastSosStatusUpdate: jest.fn(),
    alertNoTeamAvailable: jest.fn(),
    notifyTeamAssigned: jest.fn(),
    notifyTeamReassigned: jest.fn(),
  };

  const mockDispatchOrchestrator = {
    dispatch: jest.fn(),
    releaseTeamAndResolveQueue: jest.fn(),
    dispatchManual: jest.fn(),
  };

  const mockSosHistoryService = {
    record: jest.fn(),
  };

  const mockAuditLogRepo = {
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SosRequestService,
        { provide: 'ISosRequestRepository', useValue: mockSosRepo },
        { provide: 'IRescueTeamRepository', useValue: mockTeamRepo },
        { provide: 'IDispatchStrategy', useValue: mockDispatchStrategy },
        { provide: LocationService, useValue: mockLocationService },
        { provide: DispatchSocketService, useValue: mockDispatchSocketService },
        {
          provide: DispatchOrchestratorService,
          useValue: mockDispatchOrchestrator,
        },
        { provide: SosHistoryService, useValue: mockSosHistoryService },
        {
          provide: getRepositoryToken(AuditLogEntity),
          useValue: mockAuditLogRepo,
        },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<SosRequestService>(SosRequestService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const guestDto = {
      requesterName: 'Nguyễn Văn A',
      requesterPhone: '0917234567',
      requestType: SosRequestType.FLOOD,
      latitude: 10.7589,
      longitude: 106.7004,
      severity: Severity.HIGH,
      provinceId: 1,
      adminUnitId: 12,
      trappedPeopleCount: 3,
      imageUrls: ['https://storage.rescue.gov.vn/sos/img.jpg'],
    };

    it('should create SOS request successfully for guests with image', async () => {
      mockSosRepo.create.mockResolvedValue({
        id: 1,
        ...guestDto,
        status: SosStatus.PENDING,
      });

      const result = await service.create(guestDto);

      expect(result.id).toBe(1);
      expect(mockSosRepo.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException for guests without images (anti-spam)', async () => {
      const invalidDto = { ...guestDto, imageUrls: [] };

      await expect(service.create(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for guests missing requesterName', async () => {
      const invalidDto = { ...guestDto, requesterName: undefined };

      await expect(service.create(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for guests missing requesterPhone', async () => {
      const invalidDto = { ...guestDto, requesterPhone: '' };

      await expect(service.create(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create SOS request successfully for authenticated users without images', async () => {
      const authUser = { sub: 5, provinceId: 1, roleId: SystemRoleId.USER };
      const authDto = { ...guestDto, imageUrls: [] };
      mockSosRepo.create.mockResolvedValue({
        id: 1,
        requesterId: 5,
        status: SosStatus.PENDING,
      });

      const result = await service.create(authDto, authUser);

      expect(result.id).toBe(1);
      expect(mockSosRepo.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    const queryDto = { page: 1, limit: 10 };

    it('should filter by provinceId if user is not SYSTEM_ADMIN', async () => {
      const provinceAdmin = {
        sub: 2,
        provinceId: 2,
        roleId: SystemRoleId.PROVINCE_ADMIN,
      };
      mockSosRepo.findAllPaginated.mockResolvedValue({ items: [], total: 0 });

      await service.findAll(queryDto, provinceAdmin);

      expect(mockSosRepo.findAllPaginated).toHaveBeenCalledWith(
        expect.objectContaining({ provinceId: 2 }),
        { page: 1, limit: 10 },
      );
    });

    it('should filter by requesterId if user is normal resident', async () => {
      const resident = { sub: 10, provinceId: 2, roleId: SystemRoleId.USER };
      mockSosRepo.findAllPaginated.mockResolvedValue({ items: [], total: 0 });

      await service.findAll(queryDto, resident);

      expect(mockSosRepo.findAllPaginated).toHaveBeenCalledWith(
        expect.objectContaining({ requesterId: 10, provinceId: 2 }),
        { page: 1, limit: 10 },
      );
    });
  });

  describe('findNearby', () => {
    const user = { sub: 1, provinceId: 2, roleId: SystemRoleId.PROVINCE_ADMIN };

    it('should throw BadRequestException if lat or lng is missing', async () => {
      await expect(
        service.findNearby(undefined as any, 106.7, 5, SosStatus.PENDING, user),
      ).rejects.toThrow(BadRequestException);
    });

    it('should query repo and filter out requests from other provinces for non-system admin users', async () => {
      const nearbyMock = [
        { id: 1, provinceId: 2, status: SosStatus.PENDING },
        { id: 2, provinceId: 3, status: SosStatus.PENDING }, // Different province
      ];
      mockSosRepo.findNearby.mockResolvedValue(nearbyMock);

      const result = await service.findNearby(
        10.75,
        106.7,
        5,
        SosStatus.PENDING,
        user,
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('should query repo and return all results for SYSTEM_ADMIN users', async () => {
      const systemAdmin = {
        sub: 1,
        provinceId: 2,
        roleId: SystemRoleId.SYSTEM_ADMIN,
      };
      const nearbyMock = [
        { id: 1, provinceId: 2, status: SosStatus.PENDING },
        { id: 2, provinceId: 3, status: SosStatus.PENDING },
      ];
      mockSosRepo.findNearby.mockResolvedValue(nearbyMock);

      const result = await service.findNearby(
        10.75,
        106.7,
        5,
        SosStatus.PENDING,
        systemAdmin,
      );

      expect(result).toHaveLength(2);
    });
  });

  describe('updateStatus', () => {
    it('should update status and release team if RESOLVED', async () => {
      const user = {
        sub: 1,
        provinceId: 2,
        roleId: SystemRoleId.PROVINCE_ADMIN,
      };
      const sosRequest = {
        id: 1,
        status: SosStatus.DISPATCHED,
        assignedTeamId: 10,
      };
      const team = { id: 10, activeCasesCount: 1, status: TeamStatus.BUSY };

      mockSosRepo.findById.mockResolvedValue(sosRequest);
      mockTeamRepo.findById.mockResolvedValue(team);
      mockSosRepo.update.mockResolvedValue({
        ...sosRequest,
        status: SosStatus.RESOLVED,
      });

      const result = await service.updateStatus(
        1,
        { status: SosStatus.RESOLVED },
        user,
      );

      expect(result.status).toBe(SosStatus.RESOLVED);
      expect(
        mockDispatchOrchestrator.releaseTeamAndResolveQueue,
      ).toHaveBeenCalledWith(10);
    });
  });

  describe('assignTeam', () => {
    it('should auto-assign team using strategy if teamId is not provided', async () => {
      const user = {
        sub: 1,
        provinceId: 2,
        roleId: SystemRoleId.PROVINCE_ADMIN,
      };
      const sosRequest = { id: 1, status: SosStatus.PENDING, provinceId: 2 };
      const team = {
        id: 22,
        provinceId: 2,
        status: TeamStatus.AVAILABLE,
        activeCasesCount: 0,
      };

      mockSosRepo.findById.mockResolvedValue({
        ...sosRequest,
        assignedTeamId: 22,
        status: SosStatus.DISPATCHED,
        dispatchMethod: DispatchMethod.AUTO,
      });
      mockDispatchOrchestrator.dispatch.mockResolvedValue({
        type: 'dispatched',
        assignedTeamId: 22,
      });

      const result = await service.assignTeam(1, {}, user);

      expect(result.assignedTeamId).toBe(22);
      expect(result.dispatchMethod).toBe(DispatchMethod.AUTO);
      expect(mockDispatchOrchestrator.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1 }),
      );
    });

    it('should reassign from Team A to Team B, releasing Team A and busy-ing Team B', async () => {
      const user = {
        sub: 1,
        provinceId: 2,
        roleId: SystemRoleId.PROVINCE_ADMIN,
      };
      const sosRequest = {
        id: 1,
        status: SosStatus.DISPATCHED,
        provinceId: 2,
        assignedTeamId: 10,
      };

      const teamA = {
        id: 10,
        provinceId: 2,
        status: TeamStatus.BUSY,
        activeCasesCount: 1,
      };
      const teamB = {
        id: 22,
        provinceId: 2,
        status: TeamStatus.AVAILABLE,
        activeCasesCount: 0,
      };

      mockSosRepo.findById.mockResolvedValue({
        ...sosRequest,
        assignedTeamId: 22,
        status: SosStatus.DISPATCHED,
        dispatchMethod: DispatchMethod.MANUAL,
      });
      mockTeamRepo.findById.mockImplementation((id) => {
        if (id === 10) return Promise.resolve(teamA);
        if (id === 22) return Promise.resolve(teamB);
        return Promise.resolve(null);
      });
      mockDispatchOrchestrator.dispatchManual.mockResolvedValue({
        type: 'dispatched',
        assignedTeamId: 22,
      });

      const result = await service.assignTeam(1, { teamId: 22 }, user);

      expect(result.assignedTeamId).toBe(22);
      expect(mockDispatchOrchestrator.dispatchManual).toHaveBeenCalledWith(
        1,
        22,
        user.sub,
      );
    });

    it('should fail manual assignment if team is busy', async () => {
      const user = {
        sub: 1,
        provinceId: 2,
        roleId: SystemRoleId.PROVINCE_ADMIN,
      };
      const sosRequest = { id: 1, status: SosStatus.PENDING, provinceId: 2 };
      const team = {
        id: 22,
        provinceId: 2,
        status: TeamStatus.BUSY,
        activeCasesCount: 1,
      };

      mockSosRepo.findById.mockResolvedValue(sosRequest);
      mockTeamRepo.findById.mockResolvedValue(team);

      await expect(service.assignTeam(1, { teamId: 22 }, user)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('cancel', () => {
    it('should release team if cancelled at DISPATCHED status', async () => {
      const user = { sub: 5, provinceId: 2, roleId: SystemRoleId.USER };
      const sosRequest = {
        id: 1,
        requesterId: 5,
        status: SosStatus.DISPATCHED,
        assignedTeamId: 10,
      };
      const team = { id: 10, activeCasesCount: 1, status: TeamStatus.BUSY };

      mockSosRepo.findById.mockResolvedValue(sosRequest);
      mockTeamRepo.findById.mockResolvedValue(team);
      mockSosRepo.update.mockResolvedValue({
        ...sosRequest,
        status: SosStatus.CANCELLED,
      });

      const result = await service.cancel(1, { reason: 'Safe' }, user);

      expect(result.status).toBe(SosStatus.CANCELLED);
      expect(
        mockDispatchOrchestrator.releaseTeamAndResolveQueue,
      ).toHaveBeenCalledWith(10);
    });

    it('should allow guest cancellation (no user token) if status is PENDING', async () => {
      const sosRequest = {
        id: 1,
        status: SosStatus.PENDING,
        assignedTeamId: null,
      };
      mockSosRepo.findById.mockResolvedValue(sosRequest);
      mockSosRepo.update.mockResolvedValue({
        ...sosRequest,
        status: SosStatus.CANCELLED,
      });

      const result = await service.cancel(1, { reason: 'No longer needed' });

      expect(result.status).toBe(SosStatus.CANCELLED);
    });

    it('should reject guest cancellation if status is ON_SITE', async () => {
      const sosRequest = { id: 1, status: SosStatus.ON_SITE };
      mockSosRepo.findById.mockResolvedValue(sosRequest);

      await expect(service.cancel(1, { reason: 'Safe' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject resident cancellation if trying to cancel another user request', async () => {
      const residentUser = {
        sub: 99,
        provinceId: 2,
        roleId: SystemRoleId.USER,
      };
      const sosRequest = { id: 1, requesterId: 5, status: SosStatus.PENDING }; // Created by userId = 5
      mockSosRepo.findById.mockResolvedValue(sosRequest);

      await expect(
        service.cancel(1, { reason: 'Safe' }, residentUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject cancellation if status is ON_SITE for resident', async () => {
      const user = { sub: 5, provinceId: 2, roleId: SystemRoleId.USER };
      const sosRequest = { id: 1, requesterId: 5, status: SosStatus.ON_SITE };

      mockSosRepo.findById.mockResolvedValue(sosRequest);

      await expect(service.cancel(1, { reason: 'Safe' }, user)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
