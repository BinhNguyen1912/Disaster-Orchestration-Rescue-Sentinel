import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { RescueTeamService } from './rescue-team.service';
import { RoleInTeam } from '@shared/core/enums/roleInTeam.enum';
import { TeamType } from '@shared/core/enums/teamType.enum';
import { TeamStatus } from '@shared/core/enums/teamStatus.enum';
import { IRescueTeamRepository } from '../../domain/repositories/rescue-team.repository.interface';
import { IRescueTeamMemberRepository } from '../../domain/repositories/rescue-team-member.repository.interface';
import { ITeamSpecializationRepository } from '../../domain/repositories/team-specialization.repository.interface';
import { IProvinceRepository } from '../../../location/domain/repositories/location.repository.interface';
import { IWardRepository } from '../../../location/domain/repositories/location.repository.interface';

describe('RescueTeamService', () => {
  let service: RescueTeamService;
  let teamRepo: jest.Mocked<IRescueTeamRepository>;
  let memberRepo: jest.Mocked<IRescueTeamMemberRepository>;
  let specRepo: jest.Mocked<ITeamSpecializationRepository>;
  let provinceRepo: jest.Mocked<IProvinceRepository>;
  let wardRepo: jest.Mocked<IWardRepository>;

  const mockTeamRepo = {
    create: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    countActiveCases: jest.fn(),
  };

  const mockMemberRepo = {
    create: jest.fn(),
    findById: jest.fn(),
    findByUserId: jest.fn(),
    findByTeamId: jest.fn(),
    findByCitizenInfo: jest.fn(),
    findLeaderByTeamId: jest.fn(),
    countActiveMembers: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RescueTeamService,
        { provide: 'IRescueTeamRepository', useValue: mockTeamRepo },
        { provide: 'IRescueTeamMemberRepository', useValue: mockMemberRepo },
        { provide: 'ITeamSpecializationRepository', useValue: mockSpecRepo },
        { provide: 'IProvinceRepository', useValue: mockProvinceRepo },
        { provide: 'IWardRepository', useValue: mockWardRepo },
      ],
    }).compile();

    service = module.get<RescueTeamService>(RescueTeamService);
    teamRepo = module.get('IRescueTeamRepository');
    memberRepo = module.get('IRescueTeamMemberRepository');
    specRepo = module.get('ITeamSpecializationRepository');
    provinceRepo = module.get('IProvinceRepository');
    wardRepo = module.get('IWardRepository');
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
        activeCasesCount: 0,
        totalMissions: 0,
        totalRescued: 0,
        totalHoursActive: 0,
        specializations: [],
      });
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

    it('should throw BadRequestException when team has active members', async () => {
      mockTeamRepo.findById.mockResolvedValue({ id: 1 });
      mockMemberRepo.countActiveMembers.mockResolvedValue(3);

      await expect(service.delete(1)).rejects.toThrow(BadRequestException);
    });

    it('should delete team when no active members', async () => {
      mockTeamRepo.findById.mockResolvedValue({ id: 1 });
      mockMemberRepo.countActiveMembers.mockResolvedValue(0);
      mockTeamRepo.delete.mockResolvedValue(true);

      await service.delete(1);

      expect(mockTeamRepo.delete).toHaveBeenCalledWith(1);
    });
  });

  // ========================================
  // ADD MEMBER
  // ========================================
  describe('addMember', () => {
    beforeEach(() => {
      mockMemberRepo.findByCitizenInfo.mockResolvedValue(null);
      mockMemberRepo.findLeaderByTeamId.mockResolvedValue(null);
      mockMemberRepo.create.mockResolvedValue({ id: 1, teamId: 1 });
      mockTeamRepo.update.mockResolvedValue({ id: 1 });
    });

    it('should throw BadRequestException when neither userId nor citizenName provided', async () => {
      const dto = { roleInTeam: RoleInTeam.MEMBER };

      await expect(service.addMember(1, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should add member with userId only', async () => {
      const dto = { userId: 1, roleInTeam: RoleInTeam.MEMBER };

      const result = await service.addMember(1, dto);

      expect(mockMemberRepo.create).toHaveBeenCalledWith({
        teamId: 1,
        userId: 1,
        citizenName: null,
        citizenPhone: null,
        roleInTeam: RoleInTeam.MEMBER,
        joinedAt: expect.any(Date),
        specializationIds: [],
      });
    });

    it('should add member with citizenName only (no userId)', async () => {
      const dto = {
        citizenName: 'Nguyen Van A',
        citizenPhone: '0912345678',
        roleInTeam: RoleInTeam.MEMBER,
      };

      await service.addMember(1, dto);

      expect(mockMemberRepo.create).toHaveBeenCalledWith({
        teamId: 1,
        userId: null,
        citizenName: 'Nguyen Van A',
        citizenPhone: '0912345678',
        roleInTeam: RoleInTeam.MEMBER,
        joinedAt: expect.any(Date),
        specializationIds: [],
      });
    });

    it('should throw ConflictException when citizen already registered', async () => {
      const dto = {
        citizenName: 'Nguyen Van A',
        citizenPhone: '0912345678',
        roleInTeam: RoleInTeam.MEMBER,
      };
      mockMemberRepo.findByCitizenInfo.mockResolvedValue({ id: 5 });

      await expect(service.addMember(1, dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should assign leaderId when adding LEADER with userId', async () => {
      const dto = { userId: 1, roleInTeam: RoleInTeam.LEADER };

      await service.addMember(1, dto);

      expect(mockTeamRepo.update).toHaveBeenCalledWith(1, { leaderId: 1 });
    });

    it('should assign leaderCitizenName when adding LEADER with citizenName (no userId)', async () => {
      const dto = {
        citizenName: 'Nguyen Van A',
        citizenPhone: '0912345678',
        roleInTeam: RoleInTeam.LEADER,
      };

      await service.addMember(1, dto);

      expect(mockTeamRepo.update).toHaveBeenCalledWith(1, {
        leaderId: undefined,
        leaderCitizenName: 'Nguyen Van A',
        leaderPhone: '0912345678',
      });
    });

    it('should demote current leader when adding new LEADER', async () => {
      const currentLeader = { id: 10, roleInTeam: RoleInTeam.LEADER };
      mockMemberRepo.findLeaderByTeamId.mockResolvedValue(currentLeader);
      const dto = { userId: 2, roleInTeam: RoleInTeam.LEADER };

      await service.addMember(1, dto);

      expect(mockMemberRepo.update).toHaveBeenCalledWith(10, {
        roleInTeam: RoleInTeam.MEMBER,
      });
    });

    it('should not call teamRepo.update when adding regular MEMBER', async () => {
      const dto = { userId: 1, roleInTeam: RoleInTeam.MEMBER };

      await service.addMember(1, dto);

      // update should only be called for LEADER role
      expect(mockTeamRepo.update).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // REMOVE MEMBER
  // ========================================
  describe('removeMember', () => {
    it('should throw NotFoundException when member not found', async () => {
      mockMemberRepo.findById.mockResolvedValue(null);

      await expect(service.removeMember(1, 999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when member belongs to different team', async () => {
      mockMemberRepo.findById.mockResolvedValue({ id: 1, teamId: 999 });

      await expect(service.removeMember(1, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when removing last member', async () => {
      mockMemberRepo.findById.mockResolvedValue({
        id: 1,
        teamId: 1,
        roleInTeam: RoleInTeam.MEMBER,
      });
      mockMemberRepo.countActiveMembers.mockResolvedValue(1);

      await expect(service.removeMember(1, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should softDelete member successfully', async () => {
      mockMemberRepo.findById.mockResolvedValue({
        id: 1,
        teamId: 1,
        roleInTeam: RoleInTeam.MEMBER,
      });
      mockMemberRepo.countActiveMembers.mockResolvedValue(2);
      mockMemberRepo.softDelete.mockResolvedValue(true);

      await service.removeMember(1, 1);

      expect(mockMemberRepo.softDelete).toHaveBeenCalledWith(1);
    });

    it('should promote deputy to LEADER when removing current LEADER', async () => {
      const currentLeader = {
        id: 1,
        teamId: 1,
        roleInTeam: RoleInTeam.LEADER,
        userId: 10,
      };
      const deputy = {
        id: 2,
        teamId: 1,
        roleInTeam: RoleInTeam.DEPUTY_LEADER,
        userId: 20,
      };
      mockMemberRepo.findById.mockResolvedValue(currentLeader);
      mockMemberRepo.countActiveMembers.mockResolvedValue(2);
      mockMemberRepo.findByTeamId.mockResolvedValue({
        items: [deputy],
        total: 1,
      });
      mockMemberRepo.softDelete.mockResolvedValue(true);

      await service.removeMember(1, 1);

      expect(mockMemberRepo.update).toHaveBeenCalledWith(2, {
        roleInTeam: RoleInTeam.LEADER,
      });
      expect(mockTeamRepo.update).toHaveBeenCalledWith(1, { leaderId: 20 });
    });

    it('should throw BadRequestException when removing LEADER who is the last member', async () => {
      const currentLeader = {
        id: 1,
        teamId: 1,
        roleInTeam: RoleInTeam.LEADER,
        userId: 10,
      };
      mockMemberRepo.findById.mockResolvedValue(currentLeader);
      mockMemberRepo.countActiveMembers.mockResolvedValue(1);

      // Không thể remove thành viên cuối cùng - phải dùng leaveTeam
      await expect(service.removeMember(1, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle deputy without userId (citizen) when promoting', async () => {
      const currentLeader = {
        id: 1,
        teamId: 1,
        roleInTeam: RoleInTeam.LEADER,
        userId: 10,
      };
      const deputyCitizen = {
        id: 2,
        teamId: 1,
        roleInTeam: RoleInTeam.DEPUTY_LEADER,
        userId: null,
        citizenName: 'Tran Van B',
        citizenPhone: '0987654321',
      };
      mockMemberRepo.findById.mockResolvedValue(currentLeader);
      mockMemberRepo.countActiveMembers.mockResolvedValue(2);
      mockMemberRepo.findByTeamId.mockResolvedValue({
        items: [deputyCitizen],
        total: 1,
      });
      mockMemberRepo.softDelete.mockResolvedValue(true);

      await service.removeMember(1, 1);

      expect(mockMemberRepo.update).toHaveBeenCalledWith(2, {
        roleInTeam: RoleInTeam.LEADER,
      });
      expect(mockTeamRepo.update).toHaveBeenCalledWith(1, {
        leaderId: undefined,
        leaderCitizenName: 'Tran Van B',
        leaderPhone: '0987654321',
      });
    });
  });

  // ========================================
  // UPDATE MEMBER ROLE
  // ========================================
  describe('updateMemberRole', () => {
    it('should throw NotFoundException when member not found', async () => {
      mockMemberRepo.findById.mockResolvedValue(null);

      await expect(
        service.updateMemberRole(1, 999, {
          roleInTeam: RoleInTeam.DEPUTY_LEADER,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when member belongs to different team', async () => {
      mockMemberRepo.findById.mockResolvedValue({ id: 1, teamId: 999 });

      await expect(
        service.updateMemberRole(1, 1, {
          roleInTeam: RoleInTeam.DEPUTY_LEADER,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update role successfully', async () => {
      mockMemberRepo.findById.mockResolvedValue({
        id: 1,
        teamId: 1,
        roleInTeam: RoleInTeam.MEMBER,
        userId: 5,
      });
      mockMemberRepo.update.mockResolvedValue({
        id: 1,
        roleInTeam: RoleInTeam.DEPUTY_LEADER,
      });

      const result = await service.updateMemberRole(1, 1, {
        roleInTeam: RoleInTeam.DEPUTY_LEADER,
      });

      expect(mockMemberRepo.update).toHaveBeenCalledWith(1, {
        roleInTeam: RoleInTeam.DEPUTY_LEADER,
      });
    });

    it('should promote to LEADER with userId and update team leaderId', async () => {
      mockMemberRepo.findById.mockResolvedValue({
        id: 1,
        teamId: 1,
        roleInTeam: RoleInTeam.MEMBER,
        userId: 5,
      });
      mockMemberRepo.findLeaderByTeamId.mockResolvedValue(null);
      mockMemberRepo.update.mockResolvedValue({ id: 1 });

      await service.updateMemberRole(1, 1, { roleInTeam: RoleInTeam.LEADER });

      expect(mockTeamRepo.update).toHaveBeenCalledWith(1, { leaderId: 5 });
    });

    it('should promote to LEADER with citizen (no userId) and update leaderCitizenName', async () => {
      mockMemberRepo.findById.mockResolvedValue({
        id: 1,
        teamId: 1,
        roleInTeam: RoleInTeam.MEMBER,
        userId: null,
        citizenName: 'Pham Van C',
        citizenPhone: '0909123456',
      });
      mockMemberRepo.findLeaderByTeamId.mockResolvedValue(null);
      mockMemberRepo.update.mockResolvedValue({ id: 1 });

      await service.updateMemberRole(1, 1, { roleInTeam: RoleInTeam.LEADER });

      expect(mockTeamRepo.update).toHaveBeenCalledWith(1, {
        leaderId: undefined,
        leaderCitizenName: 'Pham Van C',
        leaderPhone: '0909123456',
      });
    });

    it('should demote current leader when promoting new LEADER', async () => {
      const currentLeader = {
        id: 10,
        teamId: 1,
        roleInTeam: RoleInTeam.LEADER,
        userId: 1,
      };
      mockMemberRepo.findById.mockResolvedValue({
        id: 2,
        teamId: 1,
        roleInTeam: RoleInTeam.MEMBER,
        userId: 5,
      });
      mockMemberRepo.findLeaderByTeamId.mockResolvedValue(currentLeader);
      mockMemberRepo.update.mockResolvedValue({ id: 2 });

      await service.updateMemberRole(1, 2, { roleInTeam: RoleInTeam.LEADER });

      expect(mockMemberRepo.update).toHaveBeenCalledWith(10, {
        roleInTeam: RoleInTeam.MEMBER,
      });
    });
  });

  // ========================================
  // LEAVE TEAM
  // ========================================
  describe('leaveTeam', () => {
    it('should throw NotFoundException when member not found', async () => {
      mockMemberRepo.findByUserId.mockResolvedValue(null);

      await expect(service.leaveTeam(999)).rejects.toThrow(NotFoundException);
    });

    it('should softDelete member when non-LEADER leaves', async () => {
      mockMemberRepo.findByUserId.mockResolvedValue({
        id: 1,
        teamId: 1,
        roleInTeam: RoleInTeam.MEMBER,
        userId: 5,
      });
      mockMemberRepo.countActiveMembers.mockResolvedValue(3);
      mockMemberRepo.softDelete.mockResolvedValue(true);

      await service.leaveTeam(5);

      expect(mockMemberRepo.softDelete).toHaveBeenCalledWith(1);
      expect(mockTeamRepo.update).not.toHaveBeenCalled();
    });

    it('should clear leader fields when LEADER is last member', async () => {
      mockMemberRepo.findByUserId.mockResolvedValue({
        id: 1,
        teamId: 1,
        roleInTeam: RoleInTeam.LEADER,
        userId: 5,
      });
      mockMemberRepo.countActiveMembers.mockResolvedValue(1);
      mockMemberRepo.softDelete.mockResolvedValue(true);

      await service.leaveTeam(5);

      expect(mockTeamRepo.update).toHaveBeenCalledWith(1, {
        leaderId: undefined,
        leaderCitizenName: undefined,
        leaderPhone: undefined,
      });
      expect(mockMemberRepo.softDelete).toHaveBeenCalledWith(1);
    });

    it('should promote deputy to LEADER when LEADER leaves with other members', async () => {
      const deputy = {
        id: 2,
        teamId: 1,
        roleInTeam: RoleInTeam.DEPUTY_LEADER,
        userId: 20,
      };
      mockMemberRepo.findByUserId.mockResolvedValue({
        id: 1,
        teamId: 1,
        roleInTeam: RoleInTeam.LEADER,
        userId: 5,
      });
      mockMemberRepo.countActiveMembers.mockResolvedValue(2);
      mockMemberRepo.findByTeamId.mockResolvedValue({
        items: [deputy],
        total: 1,
      });
      mockMemberRepo.softDelete.mockResolvedValue(true);

      await service.leaveTeam(5);

      expect(mockMemberRepo.update).toHaveBeenCalledWith(2, {
        roleInTeam: RoleInTeam.LEADER,
      });
      expect(mockTeamRepo.update).toHaveBeenCalledWith(1, { leaderId: 20 });
    });

    it('should promote citizen deputy when LEADER leaves', async () => {
      const deputyCitizen = {
        id: 2,
        teamId: 1,
        roleInTeam: RoleInTeam.DEPUTY_LEADER,
        userId: null,
        citizenName: 'Le Van D',
        citizenPhone: '0933123456',
      };
      mockMemberRepo.findByUserId.mockResolvedValue({
        id: 1,
        teamId: 1,
        roleInTeam: RoleInTeam.LEADER,
        userId: 5,
      });
      mockMemberRepo.countActiveMembers.mockResolvedValue(2);
      mockMemberRepo.findByTeamId.mockResolvedValue({
        items: [deputyCitizen],
        total: 1,
      });
      mockMemberRepo.softDelete.mockResolvedValue(true);

      await service.leaveTeam(5);

      expect(mockMemberRepo.update).toHaveBeenCalledWith(2, {
        roleInTeam: RoleInTeam.LEADER,
      });
      expect(mockTeamRepo.update).toHaveBeenCalledWith(1, {
        leaderId: undefined,
        leaderCitizenName: 'Le Van D',
        leaderPhone: '0933123456',
      });
    });

    it('should clear leader fields when no deputy available', async () => {
      mockMemberRepo.findByUserId.mockResolvedValue({
        id: 1,
        teamId: 1,
        roleInTeam: RoleInTeam.LEADER,
        userId: 5,
      });
      mockMemberRepo.countActiveMembers.mockResolvedValue(2);
      mockMemberRepo.findByTeamId.mockResolvedValue({ items: [], total: 0 });
      mockMemberRepo.softDelete.mockResolvedValue(true);

      await service.leaveTeam(5);

      expect(mockTeamRepo.update).toHaveBeenCalledWith(1, {
        leaderId: undefined,
        leaderCitizenName: undefined,
        leaderPhone: undefined,
      });
    });
  });

  // ========================================
  // GET MEMBERS
  // ========================================
  describe('getMembers', () => {
    it('should return paginated members', async () => {
      const mockPaginatedResult = {
        items: [
          { id: 1, name: 'Member 1' },
          { id: 2, name: 'Member 2' },
        ],
        total: 2,
        page: 1,
        limit: 20,
      };
      mockMemberRepo.findByTeamId.mockResolvedValue(mockPaginatedResult);

      const result = await service.getMembers(1, { isActive: true });

      expect(result.items).toHaveLength(2);
      expect(mockMemberRepo.findByTeamId).toHaveBeenCalledWith(1, {
        isActive: true,
      });
    });
  });
});
