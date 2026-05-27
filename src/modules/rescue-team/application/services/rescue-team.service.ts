import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import type { CreateRescueTeamDto } from '../../presentation/dtos/rescue-team/create-rescue-team.dto';
import type { UpdateRescueTeamDto } from '../../presentation/dtos/rescue-team/update-rescue-team.dto';
import type { UpdateRescueTeamLocationDto } from '../../presentation/dtos/rescue-team/update-rescue-team-location.dto';
import type { AddMemberDto } from '../../presentation/dtos/rescue-team/add-member.dto';
import type { UpdateMemberRoleDto } from '../../presentation/dtos/rescue-team/update-member-role.dto';
import { RoleInTeam } from '@shared/core/enums/roleInTeam.enum';
import type { IRescueTeamRepository } from '../../domain/repositories/rescue-team.repository.interface';
import type { IRescueTeamMemberRepository } from '../../domain/repositories/rescue-team-member.repository.interface';
import type { ITeamSpecializationRepository } from '../../domain/repositories/team-specialization.repository.interface';

@Injectable()
export class RescueTeamService {
  constructor(
    @Inject('IRescueTeamRepository')
    private readonly teamRepo: IRescueTeamRepository,
    @Inject('IRescueTeamMemberRepository')
    private readonly memberRepo: IRescueTeamMemberRepository,
    @Inject('ITeamSpecializationRepository')
    private readonly specRepo: ITeamSpecializationRepository,
  ) {}

  async create(dto: CreateRescueTeamDto, userId: number) {
    // Validate specializationIds belong to teamType
    if (dto.specializationIds && dto.specializationIds.length > 0) {
      const specs = await this.specRepo.findByIds(dto.specializationIds);
      const invalid = specs.filter((s) => s.teamType !== dto.teamType);
      if (invalid.length > 0) {
        throw new BadRequestException('INVALID_SPECIALIZATION_FOR_TEAM_TYPE');
      }
    }

    return this.teamRepo.create({
      ...dto,
      createdBy: userId,
      activeCasesCount: 0,
      totalMissions: 0,
      totalRescued: 0,
      totalHoursActive: 0,
    });
  }

  async findAll(filters: any, pagination: any) {
    return this.teamRepo.findAll(filters, pagination);
  }

  async findById(id: number) {
    const team = await this.teamRepo.findById(id);
    if (!team) {
      throw new NotFoundException('RESCUE_TEAM_NOT_FOUND');
    }
    return team;
  }

  async update(id: number, dto: UpdateRescueTeamDto) {
    const team = await this.teamRepo.update(id, dto);
    if (!team) {
      throw new NotFoundException('RESCUE_TEAM_NOT_FOUND');
    }
    return team;
  }

  async updateLocation(id: number, dto: UpdateRescueTeamLocationDto) {
    const team = await this.teamRepo.update(id, {
      currentLocation: dto.currentLocation,
      ...(dto.status && { status: dto.status }),
    });
    if (!team) {
      throw new NotFoundException('RESCUE_TEAM_NOT_FOUND');
    }
    return team;
  }

  async delete(id: number) {
    const team = await this.teamRepo.findById(id);
    if (!team) {
      throw new NotFoundException('RESCUE_TEAM_NOT_FOUND');
    }

    const activeMembers = await this.memberRepo.countActiveMembers(id);
    if (activeMembers > 0) {
      throw new BadRequestException('CANNOT_DELETE_TEAM_WITH_ACTIVE_MEMBERS');
    }

    await this.teamRepo.delete(id);
    return { success: true };
  }

  async addMember(teamId: number, dto: AddMemberDto) {
    // Check user not already in another active team
    const existing = await this.memberRepo.findByUserId(dto.userId);
    if (existing && existing.isActive) {
      throw new ConflictException('USER_ALREADY_IN_TEAM');
    }

    // If role is LEADER, demote current leader
    if (dto.roleInTeam === RoleInTeam.LEADER) {
      const currentLeader = await this.memberRepo.findLeaderByTeamId(teamId);
      if (currentLeader) {
        await this.memberRepo.update(currentLeader.id, {
          roleInTeam: RoleInTeam.MEMBER,
        });
        // Also update team.leaderId
        await this.teamRepo.update(teamId, { leaderId: dto.userId });
      }
    }

    const member = await this.memberRepo.create({
      teamId,
      userId: dto.userId,
      roleInTeam: dto.roleInTeam,
      joinedAt: new Date(),
      isActive: true,
      missionsCount: 0,
      rescuedCount: 0,
      hoursActive: 0,
    });

    // If LEADER, set leaderId on team
    if (dto.roleInTeam === RoleInTeam.LEADER) {
      await this.teamRepo.update(teamId, { leaderId: dto.userId });
    }

    return member;
  }

  async removeMember(teamId: number, memberId: number) {
    const member = await this.memberRepo.findById(memberId);
    if (!member || member.teamId !== teamId) {
      throw new NotFoundException('MEMBER_NOT_FOUND');
    }

    // Cannot remove last member (the leader)
    const activeCount = await this.memberRepo.countActiveMembers(teamId);
    if (activeCount <= 1) {
      throw new BadRequestException('CANNOT_REMOVE_LAST_MEMBER');
    }

    // If LEADER, clear leaderId and promote deputy
    if (member.roleInTeam === RoleInTeam.LEADER) {
      await this.teamRepo.update(teamId, { leaderId: undefined });
      // Promote first deputy leader to leader
      const deputies = await this.memberRepo.findByTeamId(teamId, {
        isActive: true,
      });
      const deputy = deputies.items.find(
        (m) => m.roleInTeam === RoleInTeam.DEPUTY_LEADER,
      );
      if (deputy) {
        await this.memberRepo.update(deputy.id, {
          roleInTeam: RoleInTeam.LEADER,
        });
        await this.teamRepo.update(teamId, { leaderId: deputy.userId });
      }
    }

    await this.memberRepo.softDelete(memberId);
    return { success: true };
  }

  async updateMemberRole(
    teamId: number,
    memberId: number,
    dto: UpdateMemberRoleDto,
  ) {
    const member = await this.memberRepo.findById(memberId);
    if (!member || member.teamId !== teamId) {
      throw new NotFoundException('MEMBER_NOT_FOUND');
    }

    // Demote current leader if promoting new leader
    if (dto.roleInTeam === RoleInTeam.LEADER) {
      const currentLeader = await this.memberRepo.findLeaderByTeamId(teamId);
      if (currentLeader) {
        await this.memberRepo.update(currentLeader.id, {
          roleInTeam: RoleInTeam.MEMBER,
        });
      }
      await this.teamRepo.update(teamId, { leaderId: member.userId });
    }

    return this.memberRepo.update(memberId, { roleInTeam: dto.roleInTeam });
  }

  async leaveTeam(userId: number) {
    const member = await this.memberRepo.findByUserId(userId);
    if (!member) {
      throw new NotFoundException('MEMBER_NOT_FOUND');
    }

    const teamId = member.teamId;
    const activeCount = await this.memberRepo.countActiveMembers(teamId);

    // If LEADER and only member, clear leaderId
    if (member.roleInTeam === RoleInTeam.LEADER && activeCount <= 1) {
      await this.teamRepo.update(teamId, { leaderId: undefined });
    }

    // If LEADER, promote deputy
    if (member.roleInTeam === RoleInTeam.LEADER) {
      const deputies = await this.memberRepo.findByTeamId(teamId, {
        isActive: true,
      });
      const deputy = deputies.items.find(
        (m) => m.roleInTeam === RoleInTeam.DEPUTY_LEADER,
      );
      if (deputy) {
        await this.memberRepo.update(deputy.id, {
          roleInTeam: RoleInTeam.LEADER,
        });
        await this.teamRepo.update(teamId, { leaderId: deputy.userId });
      }
    }

    await this.memberRepo.softDelete(member.id);
    return { success: true };
  }

  async getMembers(teamId: number, filters: { isActive?: boolean }) {
    return this.memberRepo.findByTeamId(teamId, filters);
  }
}
