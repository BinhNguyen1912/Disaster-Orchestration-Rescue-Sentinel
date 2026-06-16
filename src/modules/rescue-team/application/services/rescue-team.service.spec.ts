import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RescueTeamService } from './rescue-team.service';
import { TeamType } from '@shared/core/enums/teamType.enum';
import { TeamStatus } from '@shared/core/enums/teamStatus.enum';
import { ConfigService } from '@nestjs/config';

describe('RescueTeamService', () => {
  let service: RescueTeamService;

  const mockTeamRepo = {
    create: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    countActiveCases: jest.fn(),
  };

  const mockSpecRepo = {
    findByIds: jest.fn(),
  };

  const mockProvinceRepo = {
    findById: jest.fn(),
  };

  const mockWardRepo = {
    findById: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const keys: Record<string, string> = {
        DEFAULT_LOGO_PCCC: 'pccc-logo-url',
        DEFAULT_LOGO_YTE: 'yte-logo-url',
        DEFAULT_LOGO_VOLUNTEER: 'volunteer-logo-url',
        DEFAULT_LOGO_GENERAL: 'general-logo-url',
      };
      return keys[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RescueTeamService,
        { provide: 'IRescueTeamRepository', useValue: mockTeamRepo },
        { provide: 'ITeamSpecializationRepository', useValue: mockSpecRepo },
        { provide: 'IProvinceRepository', useValue: mockProvinceRepo },
        { provide: 'IWardRepository', useValue: mockWardRepo },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<RescueTeamService>(RescueTeamService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ========================================
  // CREATE
  // ========================================
  describe('create', () => {
    const validDto = {
      name: 'Team Alpha',
      teamType: TeamType.PCCC,
      provinceId: 1,
      adminUnitId: 1,
    };

    const validProvince = { id: 1, name: 'Ho Chi Minh City' };
    const validAdminUnit = { id: 1, provinceId: 1, name: 'Ward 1' };

    beforeEach(() => {
      mockProvinceRepo.findById.mockResolvedValue(validProvince);
      mockWardRepo.findById.mockResolvedValue(validAdminUnit);
    });

    it('should create team successfully with valid data', async () => {
      const createdTeam = {
        id: 1,
        ...validDto,
        activeCasesCount: 0,
        totalMissions: 0,
      };
      mockTeamRepo.create.mockResolvedValue(createdTeam);

      const result = await service.create(validDto, 1);

      expect(result).toEqual(createdTeam);
      expect(mockTeamRepo.create).toHaveBeenCalledWith({
        ...validDto,
        createdBy: 1,
        specializations: [],
      });
    });

    it('should create team successfully and keep custom logoUrl if provided', async () => {
      const customDto = { ...validDto, logoUrl: 'custom-logo-url' };
      const createdTeam = {
        id: 1,
        ...customDto,
        activeCasesCount: 0,
        totalMissions: 0,
      };
      mockTeamRepo.create.mockResolvedValue(createdTeam);

      const result = await service.create(customDto, 1);

      expect(result.logoUrl).toBe('custom-logo-url');
    });

    it('should create team successfully and fallback to PCCC logo if none provided', async () => {
      const createdTeam = {
        id: 1,
        ...validDto,
        activeCasesCount: 0,
        totalMissions: 0,
      };
      mockTeamRepo.create.mockResolvedValue(createdTeam);

      const result = await service.create(validDto, 1);

      expect(result.logoUrl).toBe('pccc-logo-url');
    });

    it('should create team successfully and fallback to volunteer logo if type is TINH_NGUYEN', async () => {
      const volunteerDto = { ...validDto, teamType: TeamType.TINH_NGUYEN };
      const createdTeam = {
        id: 1,
        ...volunteerDto,
        activeCasesCount: 0,
        totalMissions: 0,
      };
      mockTeamRepo.create.mockResolvedValue(createdTeam);

      const result = await service.create(volunteerDto, 1);

      expect(result.logoUrl).toBe('volunteer-logo-url');
    });

    it('should create team successfully and fallback to general logo if type is other', async () => {
      const otherDto = { ...validDto, teamType: TeamType.QUAN_SU };
      const createdTeam = {
        id: 1,
        ...otherDto,
        activeCasesCount: 0,
        totalMissions: 0,
      };
      mockTeamRepo.create.mockResolvedValue(createdTeam);

      const result = await service.create(otherDto, 1);

      expect(result.logoUrl).toBe('general-logo-url');
    });

    it('should throw BadRequestException when province not found', async () => {
      mockProvinceRepo.findById.mockResolvedValue(null);

      await expect(service.create(validDto, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when adminUnit not found', async () => {
      mockWardRepo.findById.mockResolvedValue(null);

      await expect(service.create(validDto, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when adminUnit not in province', async () => {
      mockWardRepo.findById.mockResolvedValue({
        ...validAdminUnit,
        provinceId: 999,
      });

      await expect(service.create(validDto, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when specialization teamType mismatch', async () => {
      const dtoWithSpecs = {
        ...validDto,
        teamType: TeamType.PCCC,
        specializationIds: [1, 2],
      };
      mockSpecRepo.findByIds.mockResolvedValue([
        { id: 1, teamType: TeamType.PCCC },
        { id: 2, teamType: TeamType.Y_TE }, // Mismatch
      ]);

      await expect(service.create(dtoWithSpecs, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create team with specializations when teamType matches', async () => {
      const dtoWithSpecs = {
        ...validDto,
        teamType: TeamType.PCCC,
        specializationIds: [1],
      };
      const specs = [{ id: 1, teamType: TeamType.PCCC }];
      mockSpecRepo.findByIds.mockResolvedValue(specs);
      mockTeamRepo.create.mockResolvedValue({ id: 1 });

      await service.create(dtoWithSpecs, 1);

      expect(mockTeamRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ specializations: specs }),
      );
    });

    it('should skip specialization teamType check when teamType is not provided', async () => {
      // VOLUNTEER_SPONTANEOUS teams don't require teamType
      const dtoWithoutTeamType = {
        name: 'Team Alpha',
        provinceId: 1,
        adminUnitId: 1,
      };
      mockTeamRepo.create.mockResolvedValue({ id: 1 });

      await service.create(dtoWithoutTeamType, 1);

      // Should not call findByIds because no teamType to validate against
      expect(mockSpecRepo.findByIds).not.toHaveBeenCalled();
    });

    it('should skip specialization check when specializationIds is empty', async () => {
      const dtoWithEmptySpecs = { ...validDto, specializationIds: [] };
      mockTeamRepo.create.mockResolvedValue({ id: 1 });

      await service.create(dtoWithEmptySpecs, 1);

      expect(mockSpecRepo.findByIds).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // FIND BY ID
  // ========================================
  describe('findById', () => {
    it('should return team when found', async () => {
      const team = { id: 1, name: 'Team Alpha' };
      mockTeamRepo.findById.mockResolvedValue(team);

      const result = await service.findById(1);

      expect(result).toEqual(team);
    });

    it('should return team with logoUrl populated from fallback if database logoUrl is null', async () => {
      const team = { id: 1, name: 'Team Alpha', teamType: TeamType.Y_TE, logoUrl: null };
      mockTeamRepo.findById.mockResolvedValue(team);

      const result = await service.findById(1);

      expect(result.logoUrl).toBe('yte-logo-url');
    });

    it('should throw NotFoundException when team not found', async () => {
      mockTeamRepo.findById.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ========================================
  // FIND ALL
  // ========================================
  describe('findAll', () => {
    it('should return paginated results', async () => {
      const paginatedResult = {
        items: [{ id: 1 }, { id: 2 }],
        total: 2,
        page: 1,
        limit: 20,
      };
      mockTeamRepo.findAll.mockResolvedValue(paginatedResult);

      const result = await service.findAll({}, { page: 1, limit: 20 });

      expect(result.items).toHaveLength(2);
      expect(mockTeamRepo.findAll).toHaveBeenCalledWith(
        {},
        { page: 1, limit: 20 },
      );
    });

    it('should return paginated results with logoUrl fallback applied to all teams', async () => {
      const paginatedResult = {
        items: [
          { id: 1, teamType: TeamType.PCCC, logoUrl: null },
          { id: 2, teamType: TeamType.Y_TE, logoUrl: 'custom-url' },
        ],
        total: 2,
        page: 1,
        limit: 20,
      };
      mockTeamRepo.findAll.mockResolvedValue(paginatedResult);

      const result = await service.findAll({}, { page: 1, limit: 20 });

      expect(result.items[0].logoUrl).toBe('pccc-logo-url');
      expect(result.items[1].logoUrl).toBe('custom-url');
    });
  });

  // ========================================
  // UPDATE
  // ========================================
  describe('update', () => {
    it('should update team successfully', async () => {
      const updatedTeam = { id: 1, name: 'Updated Team' };
      mockTeamRepo.update.mockResolvedValue(updatedTeam);

      const result = await service.update(1, { name: 'Updated Team' });

      expect(result).toEqual(updatedTeam);
    });

    it('should throw NotFoundException when team not found', async () => {
      mockTeamRepo.update.mockResolvedValue(null);

      await expect(service.update(999, { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ========================================
  // UPDATE LOCATION
  // ========================================
  describe('updateLocation', () => {
    it('should update currentLocation', async () => {
      const location: { type: 'Point'; coordinates: [number, number] } = {
        type: 'Point',
        coordinates: [106.6, 10.8],
      };
      mockTeamRepo.update.mockResolvedValue({ id: 1 });

      await service.updateLocation(1, { currentLocation: location });

      expect(mockTeamRepo.update).toHaveBeenCalledWith(1, {
        currentLocation: location,
      });
    });

    it('should also update status when provided', async () => {
      mockTeamRepo.update.mockResolvedValue({ id: 1 });

      await service.updateLocation(1, {
        currentLocation: { type: 'Point', coordinates: [106.6, 10.8] },
        status: TeamStatus.BUSY,
      });

      expect(mockTeamRepo.update).toHaveBeenCalledWith(1, {
        currentLocation: { type: 'Point', coordinates: [106.6, 10.8] },
        status: TeamStatus.BUSY,
      });
    });

    it('should throw NotFoundException when team not found', async () => {
      mockTeamRepo.update.mockResolvedValue(null);

      await expect(
        service.updateLocation(999, {
          currentLocation: { type: 'Point', coordinates: [0, 0] },
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ========================================
  // DELETE
  // ========================================
  describe('delete', () => {
    it('should throw NotFoundException when team not found', async () => {
      mockTeamRepo.findById.mockResolvedValue(null);

      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
    });

    it('should delete team successfully', async () => {
      mockTeamRepo.findById.mockResolvedValue({ id: 1 });
      mockTeamRepo.delete.mockResolvedValue(true);

      await service.delete(1);

      expect(mockTeamRepo.delete).toHaveBeenCalledWith(1);
    });
  });
});
