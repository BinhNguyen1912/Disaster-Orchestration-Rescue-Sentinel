import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { RescueTeamService } from './rescue-team.service';
import { RoleInTeam } from '@shared/core/enums/roleInTeam.enum';
import { TeamType } from '@shared/core/enums/teamType.enum';
import { IRescueTeamRepository } from '../../domain/repositories/rescue-team.repository.interface';
import { IRescueTeamMemberRepository } from '../../domain/repositories/rescue-team-member.repository.interface';
import { ITeamSpecializationRepository } from '../../domain/repositories/team-specialization.repository.interface';

describe('RescueTeamService', () => {
  let service: RescueTeamService;
  let teamRepo: Partial<IRescueTeamRepository>;
  let memberRepo: Partial<IRescueTeamMemberRepository>;
  let specRepo: Partial<ITeamSpecializationRepository>;

  const mockTeamRepo = {
    create: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockMemberRepo = {
    create: jest.fn(),
    findById: jest.fn(),
    findByUserId: jest.fn(),
    findByTeamId: jest.fn(),
    findLeaderByTeamId: jest.fn(),
    countActiveMembers: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  const mockSpecRepo = {
    findByIds: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RescueTeamService,
        { provide: 'IRescueTeamRepository', useValue: mockTeamRepo },
        { provide: 'IRescueTeamMemberRepository', useValue: mockMemberRepo },
        { provide: 'ITeamSpecializationRepository', useValue: mockSpecRepo },
      ],
    }).compile();

    service = module.get<RescueTeamService>(RescueTeamService);
    teamRepo = module.get('IRescueTeamRepository');
    memberRepo = module.get('IRescueTeamMemberRepository');
    specRepo = module.get('ITeamSpecializationRepository');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a rescue team successfully', async () => {
      const dto = {
        name: 'Team Alpha',
        teamType: TeamType.PCCC,
        provinceId: 1,
        adminUnitId: 1,
      };
      const userId = 1;
      const createdTeam = { id: 1, ...dto, activeCasesCount: 0 };

      mockTeamRepo.create.mockResolvedValue(createdTeam);

      const result = await service.create(dto, userId);

      expect(result).toEqual(createdTeam);
      expect(mockTeamRepo.create).toHaveBeenCalledWith({
        ...dto,
        createdBy: userId,
        activeCasesCount: 0,
        totalMissions: 0,
        totalRescued: 0,
        totalHoursActive: 0,
      });
    });

    it('should throw BadRequestException for invalid specialization', async () => {
      const dto = {
        name: 'Team Alpha',
        teamType: TeamType.PCCC,
        provinceId: 1,
        adminUnitId: 1,
        specializationIds: [1, 2],
      };

      mockSpecRepo.findByIds.mockResolvedValue([
        { id: 1, teamType: TeamType.PCCC },
        { id: 2, teamType: 'Y_TE' }, // Wrong teamType
      ]);

      await expect(service.create(dto, 1)).rejects.toThrow(BadRequestException);
    });

    it('should allow creation without specializations', async () => {
      const dto = {
        name: 'Team Alpha',
        teamType: TeamType.PCCC,
        provinceId: 1,
        adminUnitId: 1,
      };

      mockTeamRepo.create.mockResolvedValue({ id: 1 });

      await service.create(dto, 1);

      expect(mockSpecRepo.findByIds).not.toHaveBeenCalled();
    });
  });

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

  describe('addMember', () => {
    it('should throw ConflictException when user already in active team', async () => {
      const dto = { userId: 1, roleInTeam: RoleInTeam.MEMBER };
      mockMemberRepo.findByUserId.mockResolvedValue({ isActive: true });

      await expect(service.addMember(1, dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should add member successfully', async () => {
      const dto = { userId: 1, roleInTeam: RoleInTeam.MEMBER };
      mockMemberRepo.findByUserId.mockResolvedValue(null);
      mockMemberRepo.create.mockResolvedValue({ id: 1, ...dto });

      const result = await service.addMember(1, dto);

      expect(result.id).toBe(1);
      expect(mockMemberRepo.create).toHaveBeenCalled();
    });

    it('should update team leaderId when adding a leader', async () => {
      const dto = { userId: 1, roleInTeam: RoleInTeam.LEADER };
      mockMemberRepo.findByUserId.mockResolvedValue(null);
      mockMemberRepo.findLeaderByTeamId.mockResolvedValue(null);
      mockMemberRepo.create.mockResolvedValue({ id: 1 });
      mockTeamRepo.update.mockResolvedValue({ id: 1 });

      await service.addMember(1, dto);

      expect(mockTeamRepo.update).toHaveBeenCalledWith(1, { leaderId: 1 });
    });
  });

  describe('removeMember', () => {
    it('should throw NotFoundException when member not found', async () => {
      mockMemberRepo.findById.mockResolvedValue(null);

      await expect(service.removeMember(1, 999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when removing last member', async () => {
      mockMemberRepo.findById.mockResolvedValue({
        id: 1,
        teamId: 1,
        roleInTeam: RoleInTeam.LEADER,
      });
      mockMemberRepo.countActiveMembers.mockResolvedValue(1);

      await expect(service.removeMember(1, 1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getMembers', () => {
    it('should return paginated members', async () => {
      const mockPaginatedResult = {
        items: [{ id: 1 }, { id: 2 }],
        total: 2,
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
