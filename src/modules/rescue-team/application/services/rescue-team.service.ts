import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import type { CreateRescueTeamDto } from '../dtos/create-rescue-team.dto';
import type { UpdateRescueTeamDto } from '../dtos/update-rescue-team.dto';
import type { UpdateRescueTeamLocationDto } from '../dtos/update-rescue-team-location.dto';
import type { AddMemberDto } from '../dtos/add-member.dto';
import type { UpdateMemberRoleDto } from '../dtos/update-member-role.dto';
import type { QueryRescueTeamDto } from '../dtos/query.dto';
import {
  PaginationParams,
  PaginatedResult,
} from '../../../../shared/common/dtos/pagination.dto';
import { RoleInTeam } from '@shared/core/enums/roleInTeam.enum';
import type { IRescueTeamRepository } from '../../domain/repositories/rescue-team.repository.interface';
import type { IRescueTeamMemberRepository } from '../../domain/repositories/rescue-team-member.repository.interface';
import type { ITeamSpecializationRepository } from '../../domain/repositories/team-specialization.repository.interface';
import type { IRescueTeamService } from '../interfaces/rescue-team.service.interface';
import { RescueTeam } from '../../domain/entities/rescue-team';
import { RescueTeamMember } from '../../domain/entities/rescue-team-member';

@Injectable()
export class RescueTeamService implements IRescueTeamService {
  constructor(
    @Inject('IRescueTeamRepository')
    private readonly teamRepo: IRescueTeamRepository,
    @Inject('IRescueTeamMemberRepository')
    private readonly memberRepo: IRescueTeamMemberRepository,
    @Inject('ITeamSpecializationRepository')
    private readonly specRepo: ITeamSpecializationRepository,
  ) {}

  async create(dto: CreateRescueTeamDto, userId: number): Promise<RescueTeam> {
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

  async findAll(
    filters: QueryRescueTeamDto,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<RescueTeam>> {
    return this.teamRepo.findAll(filters, {
      page: pagination.page || 1,
      limit: pagination.limit || 20,
    });
  }

  async findById(id: number): Promise<RescueTeam> {
    const team = await this.teamRepo.findById(id);
    if (!team) {
      throw new NotFoundException('RESCUE_TEAM_NOT_FOUND');
    }
    return team;
  }

  async update(id: number, dto: UpdateRescueTeamDto): Promise<RescueTeam> {
    const team = await this.teamRepo.update(id, dto);
    if (!team) {
      throw new NotFoundException('RESCUE_TEAM_NOT_FOUND');
    }
    return team;
  }

  async updateLocation(
    id: number,
    dto: UpdateRescueTeamLocationDto,
  ): Promise<RescueTeam> {
    const team = await this.teamRepo.update(id, {
      currentLocation: dto.currentLocation,
      ...(dto.status && { status: dto.status }),
    } as any);
    if (!team) {
      throw new NotFoundException('RESCUE_TEAM_NOT_FOUND');
    }
    return team;
  }

  async delete(id: number): Promise<void> {
    const team = await this.teamRepo.findById(id);
    if (!team) {
      throw new NotFoundException('RESCUE_TEAM_NOT_FOUND');
    }

    const activeMembers = await this.memberRepo.countActiveMembers(id);
    if (activeMembers > 0) {
      throw new BadRequestException('CANNOT_DELETE_TEAM_WITH_ACTIVE_MEMBERS');
    }

    await this.teamRepo.delete(id);
  }

  async addMember(
    teamId: number,
    dto: AddMemberDto,
  ): Promise<RescueTeamMember> {
    const existing = await this.memberRepo.findByUserId(dto.userId);
    if (existing && existing.isActive) {
      throw new ConflictException('USER_ALREADY_IN_TEAM');
    }

    if (dto.roleInTeam === RoleInTeam.LEADER) {
      const currentLeader = await this.memberRepo.findLeaderByTeamId(teamId);
      if (currentLeader) {
        await this.memberRepo.update(currentLeader.id, {
          roleInTeam: RoleInTeam.MEMBER,
        });
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

    if (dto.roleInTeam === RoleInTeam.LEADER) {
      await this.teamRepo.update(teamId, { leaderId: dto.userId });
    }

    return member;
  }

  async removeMember(teamId: number, memberId: number): Promise<void> {
    const member = await this.memberRepo.findById(memberId);
    if (!member || member.teamId !== teamId) {
      throw new NotFoundException('MEMBER_NOT_FOUND');
    }

    const activeCount = await this.memberRepo.countActiveMembers(teamId);
    if (activeCount <= 1) {
      throw new BadRequestException('CANNOT_REMOVE_LAST_MEMBER');
    }

    if (member.roleInTeam === RoleInTeam.LEADER) {
      await this.teamRepo.update(teamId, { leaderId: undefined });
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
  }

  async updateMemberRole(
    teamId: number,
    memberId: number,
    dto: UpdateMemberRoleDto,
  ): Promise<RescueTeamMember> {
    const member = await this.memberRepo.findById(memberId);
    if (!member || member.teamId !== teamId) {
      throw new NotFoundException('MEMBER_NOT_FOUND');
    }

    if (dto.roleInTeam === RoleInTeam.LEADER) {
      const currentLeader = await this.memberRepo.findLeaderByTeamId(teamId);
      if (currentLeader) {
        await this.memberRepo.update(currentLeader.id, {
          roleInTeam: RoleInTeam.MEMBER,
        });
      }
      await this.teamRepo.update(teamId, { leaderId: member.userId });
    }

    const updated = await this.memberRepo.update(memberId, {
      roleInTeam: dto.roleInTeam,
    });
    if (!updated) {
      throw new NotFoundException('MEMBER_NOT_FOUND');
    }
    return updated;
  }

  async leaveTeam(userId: number): Promise<void> {
    const member = await this.memberRepo.findByUserId(userId);
    if (!member) {
      throw new NotFoundException('MEMBER_NOT_FOUND');
    }

    const teamId = member.teamId;
    const activeCount = await this.memberRepo.countActiveMembers(teamId);

    if (member.roleInTeam === RoleInTeam.LEADER && activeCount <= 1) {
      await this.teamRepo.update(teamId, { leaderId: undefined });
    }

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
  }

  async getMembers(
    teamId: number,
    filters: { isActive?: boolean },
  ): Promise<PaginatedResult<RescueTeamMember>> {
    return this.memberRepo.findByTeamId(teamId, filters);
  }
}
