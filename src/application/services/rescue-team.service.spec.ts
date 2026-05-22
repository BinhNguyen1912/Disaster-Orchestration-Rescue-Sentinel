import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { RescueTeamService } from './rescue-team.service';
import { RoleInTeam } from '@domain/enums/roleInTeam.enum';
import { TeamType } from '@domain/enums/teamType.enum';

describe('RescueTeamService', () => {
  let service: RescueTeamService;

  // Mock repositories
  const mockTeamRepo = {
    findById: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    countActiveCases: jest.fn(),
  };

  const mockMemberRepo = {
    findById: jest.fn(),
    findByUserId: jest.fn(),
    findByTeamId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    countActiveMembers: jest.fn(),
    findLeaderByTeamId: jest.fn(),
  };

  const mockSpecRepo = {
    findById: jest.fn(),
    findByIds: jest.fn(),
    findByTeamType: jest.fn(),
    findAll: jest.fn(),
  };

  beforeEach(() => {
    service = new RescueTeamService(mockTeamRepo, mockMemberRepo, mockSpecRepo);
    jest.clearAllMocks();
  });

  describe('create', () => {
    const validDto = {
      provinceId: 1,
      name: 'Đội cứu hộ PCCC Hà Nội',
      teamType: TeamType.PCCC,
      adminUnitId: 1,
      specializationIds: [1, 2],
    };

    it('should create team successfully', async () => {
      mockSpecRepo.findByIds.mockResolvedValue([
        {
          id: 1,
          code: 'PCCC_CHUA_CHAY',
          name: 'Chữa cháy',
          teamType: TeamType.PCCC,
          isActive: true,
        },
        {
          id: 2,
          code: 'PCCC_CUU_HO',
          name: 'Cứu hộ',
          teamType: TeamType.PCCC,
          isActive: true,
        },
      ]);
      mockTeamRepo.create.mockResolvedValue({ id: 1, ...validDto } as any);

      const result = await service.create(validDto, 1);

      expect(result).toHaveProperty('id', 1);
      expect(mockTeamRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          provinceId: 1,
          name: validDto.name,
          teamType: validDto.teamType,
        }),
      );
    });

    it('should reject invalid specialization for teamType', async () => {
      mockSpecRepo.findByIds.mockResolvedValue([
        {
          id: 1,
          code: 'YTE_SO_CUU',
          name: 'Sơ cấp cứu',
          teamType: TeamType.Y_TE,
          isActive: true,
        },
      ]);

      await expect(service.create(validDto, 1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findById', () => {
    it('should return team when found', async () => {
      const mockTeam = { id: 1, name: 'Team A', provinceId: 1 };
      mockTeamRepo.findById.mockResolvedValue(mockTeam as any);

      const result = await service.findById(1);

      expect(result).toEqual(mockTeam);
    });

    it('should throw NotFoundException when team not found', async () => {
      mockTeamRepo.findById.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('addMember', () => {
    const teamId = 1;
    const addMemberDto = { userId: 10, roleInTeam: RoleInTeam.MEMBER };

    it('should throw ConflictException if user already in active team', async () => {
      mockMemberRepo.findByUserId.mockResolvedValue({
        id: 5,
        userId: 10,
        teamId: 2,
        isActive: true,
        roleInTeam: RoleInTeam.MEMBER,
      } as any);

      await expect(service.addMember(teamId, addMemberDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should add member successfully when user not in any team', async () => {
      mockMemberRepo.findByUserId.mockResolvedValue(null);
      mockMemberRepo.create.mockResolvedValue({
        id: 1,
        ...addMemberDto,
        teamId,
      } as any);

      const result = await service.addMember(teamId, addMemberDto);

      expect(result).toHaveProperty('id', 1);
      expect(mockMemberRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 10,
          teamId: 1,
          roleInTeam: RoleInTeam.MEMBER,
          isActive: true,
        }),
      );
    });

    it('should promote new LEADER and demote old LEADER', async () => {
      const oldLeader = {
        id: 5,
        userId: 20,
        teamId,
        roleInTeam: RoleInTeam.LEADER,
        isActive: true,
      };
      mockMemberRepo.findByUserId.mockResolvedValue(null);
      mockMemberRepo.findLeaderByTeamId.mockResolvedValue(oldLeader as any);
      mockMemberRepo.create.mockResolvedValue({
        id: 2,
        userId: 10,
        teamId,
        roleInTeam: RoleInTeam.LEADER,
      } as any);

      await service.addMember(teamId, {
        userId: 10,
        roleInTeam: RoleInTeam.LEADER,
      });

      expect(mockMemberRepo.update).toHaveBeenCalledWith(5, {
        roleInTeam: RoleInTeam.MEMBER,
      });
      expect(mockTeamRepo.update).toHaveBeenCalledWith(teamId, {
        leaderId: 10,
      });
    });
  });

  describe('removeMember', () => {
    const teamId = 1;
    const memberId = 5;

    it('should throw NotFoundException if member not found', async () => {
      mockMemberRepo.findById.mockResolvedValue(null);

      await expect(service.removeMember(teamId, memberId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if removing last member', async () => {
      mockMemberRepo.findById.mockResolvedValue({
        id: memberId,
        teamId,
        roleInTeam: RoleInTeam.MEMBER,
      } as any);
      mockMemberRepo.countActiveMembers.mockResolvedValue(1);

      await expect(service.removeMember(teamId, memberId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateMemberRole', () => {
    const teamId = 1;
    it('should demote current leader when promoting new one', async () => {
      const currentLeaderId = 5;
      const newMemberId = 10;
      const mockMember = {
        id: newMemberId,
        teamId: 1,
        userId: newMemberId,
        roleInTeam: RoleInTeam.MEMBER,
      };
      const currentLeader = {
        id: currentLeaderId,
        teamId: 1,
        roleInTeam: RoleInTeam.LEADER,
      };

      mockMemberRepo.findById.mockResolvedValue(mockMember as any);
      mockMemberRepo.findLeaderByTeamId.mockResolvedValue(currentLeader as any);
      mockMemberRepo.update.mockResolvedValue({
        ...mockMember,
        roleInTeam: RoleInTeam.LEADER,
      } as any);

      await service.updateMemberRole(teamId, newMemberId, {
        roleInTeam: RoleInTeam.LEADER,
      });

      expect(mockMemberRepo.update).toHaveBeenCalledWith(currentLeaderId, {
        roleInTeam: RoleInTeam.MEMBER,
      });
      expect(mockTeamRepo.update).toHaveBeenCalledWith(teamId, {
        leaderId: newMemberId,
      });
    });
  });

  describe('delete', () => {
    it('should throw BadRequestException if team has active members', async () => {
      mockTeamRepo.findById.mockResolvedValue({ id: 1, name: 'Team A' } as any);
      mockMemberRepo.countActiveMembers.mockResolvedValue(3);

      await expect(service.delete(1)).rejects.toThrow(BadRequestException);
    });

    it('should delete team successfully when no active members', async () => {
      mockTeamRepo.findById.mockResolvedValue({ id: 1, name: 'Team A' } as any);
      mockMemberRepo.countActiveMembers.mockResolvedValue(0);
      mockTeamRepo.delete.mockResolvedValue(true);

      const result = await service.delete(1);

      expect(result).toEqual({ success: true });
      expect(mockTeamRepo.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('leaveTeam', () => {
    it('should throw NotFoundException if user not in any team', async () => {
      mockMemberRepo.findByUserId.mockResolvedValue(null);

      await expect(service.leaveTeam(999)).rejects.toThrow(NotFoundException);
    });

    it('should promote deputy leader when leader leaves', async () => {
      const deputy = {
        id: 6,
        userId: 20,
        teamId: 1,
        roleInTeam: RoleInTeam.DEPUTY_LEADER,
        isActive: true,
      };
      const leader = {
        id: 5,
        userId: 10,
        teamId: 1,
        roleInTeam: RoleInTeam.LEADER,
        isActive: true,
      };

      mockMemberRepo.findByUserId.mockResolvedValue(leader as any);
      mockMemberRepo.countActiveMembers.mockResolvedValue(2);
      mockMemberRepo.findByTeamId.mockResolvedValue({
        items: [deputy],
        total: 2,
      } as any);
      mockMemberRepo.softDelete.mockResolvedValue(true);

      await service.leaveTeam(10);

      expect(mockMemberRepo.update).toHaveBeenCalledWith(6, {
        roleInTeam: RoleInTeam.LEADER,
      });
      expect(mockTeamRepo.update).toHaveBeenCalledWith(1, { leaderId: 20 });
    });
  });
});
