import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { RescueTeamMemberService } from './rescue-team-member.service';
import { RoleInTeam } from '@shared/core/enums/roleInTeam.enum';

describe('RescueTeamMemberService', () => {
  let service: RescueTeamMemberService;

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

  const mockTeamRepo = {
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RescueTeamMemberService,
        { provide: 'IRescueTeamMemberRepository', useValue: mockMemberRepo },
        { provide: 'IRescueTeamRepository', useValue: mockTeamRepo },
      ],
    }).compile();

    service = module.get<RescueTeamMemberService>(RescueTeamMemberService);
  });

  afterEach(() => {
    jest.clearAllMocks();
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

      await service.addMember(1, dto);

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

      await service.updateMemberRole(1, 1, {
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
