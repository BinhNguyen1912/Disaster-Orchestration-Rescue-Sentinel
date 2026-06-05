import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import type { AddMemberDto } from '../dtos/add-member.dto';
import type { UpdateMemberRoleDto } from '../dtos/update-member-role.dto';
import { RoleInTeam } from '@shared/core/enums/roleInTeam.enum';
import type { IRescueTeamMemberRepository } from '../../domain/repositories/rescue-team-member.repository.interface';
import type { IRescueTeamMemberService } from '../interfaces/rescue-team-member.service.interface';
import type { IRescueTeamRepository } from '../../../rescue-team/domain/repositories/rescue-team.repository.interface';
import { RescueTeamMember } from '../../domain/entities/rescue-team-member';

@Injectable()
export class RescueTeamMemberService implements IRescueTeamMemberService {
  constructor(
    @Inject('IRescueTeamMemberRepository')
    private readonly memberRepo: IRescueTeamMemberRepository,
    @Inject('IRescueTeamRepository')
    private readonly teamRepo: IRescueTeamRepository,
  ) {}

  async addMember(
    teamId: number,
    dto: AddMemberDto,
  ): Promise<RescueTeamMember> {
    // Validate: phải có userId HOẶC citizenName
    if (!dto.userId && !dto.citizenName) {
      throw new BadRequestException('Must provide userId or citizenName');
    }

    // Kiểm tra citizenName + citizenPhone đã tồn tại trong team này chưa (nếu là citizen)
    if (!dto.userId && dto.citizenName) {
      const existingByCitizen = await this.memberRepo.findByCitizenInfo(
        teamId,
        dto.citizenName,
        dto.citizenPhone ?? undefined,
      );
      if (existingByCitizen) {
        throw new ConflictException('Citizen already registered in this team');
      }
    }

    // Leader assignment logic
    if (dto.roleInTeam === RoleInTeam.LEADER) {
      const currentLeader = await this.memberRepo.findLeaderByTeamId(teamId);
      if (currentLeader) {
        await this.memberRepo.update(currentLeader.id, {
          roleInTeam: RoleInTeam.MEMBER,
        });
      }
      // Gán leaderId: ưu tiên userId, nếu không có thì dùng citizenName
      if (dto.userId) {
        await this.teamRepo.update(teamId, { leaderId: dto.userId });
      } else if (dto.citizenName) {
        await this.teamRepo.update(teamId, {
          leaderId: undefined,
          leaderCitizenName: dto.citizenName,
          leaderPhone: dto.citizenPhone ?? undefined,
        });
      }
    }

    const member = await this.memberRepo.create({
      teamId,
      userId: dto.userId ?? null,
      citizenName: dto.citizenName ?? null,
      citizenPhone: dto.citizenPhone ?? null,
      roleInTeam: dto.roleInTeam,
      joinedAt: new Date(),
      specializationIds: dto.specializationIds ?? [],
    });

    return member;
  }

  async removeMember(teamId: number, memberId: number): Promise<void> {
    const member = await this.memberRepo.findById(memberId);
    if (!member || member.teamId !== teamId) {
      throw new NotFoundException('Member not found');
    }

    const activeCount = await this.memberRepo.countActiveMembers(teamId);
    if (activeCount <= 1) {
      throw new BadRequestException('Cannot remove the last member');
    }

    if (member.roleInTeam === RoleInTeam.LEADER) {
      await this.teamRepo.update(teamId, {
        leaderId: undefined,
        leaderCitizenName: undefined,
        leaderPhone: undefined,
      });
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
        if (deputy.userId) {
          await this.teamRepo.update(teamId, { leaderId: deputy.userId });
        } else if (deputy.citizenName) {
          await this.teamRepo.update(teamId, {
            leaderId: undefined,
            leaderCitizenName: deputy.citizenName,
            leaderPhone: deputy.citizenPhone ?? undefined,
          });
        }
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
      throw new NotFoundException('Member not found');
    }

    if (dto.roleInTeam === RoleInTeam.LEADER) {
      const currentLeader = await this.memberRepo.findLeaderByTeamId(teamId);
      if (currentLeader) {
        await this.memberRepo.update(currentLeader.id, {
          roleInTeam: RoleInTeam.MEMBER,
        });
      }
      if (member.userId) {
        await this.teamRepo.update(teamId, { leaderId: member.userId });
      } else if (member.citizenName) {
        await this.teamRepo.update(teamId, {
          leaderId: undefined,
          leaderCitizenName: member.citizenName,
          leaderPhone: member.citizenPhone ?? undefined,
        });
      }
    }

    const updated = await this.memberRepo.update(memberId, {
      roleInTeam: dto.roleInTeam,
    });
    if (!updated) {
      throw new NotFoundException('Member not found');
    }
    return updated;
  }

  async leaveTeam(userId: number): Promise<void> {
    const member = await this.memberRepo.findByUserId(userId);
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    const teamId = member.teamId;
    const activeCount = await this.memberRepo.countActiveMembers(teamId);

    if (member.roleInTeam === RoleInTeam.LEADER) {
      if (activeCount <= 1) {
        await this.teamRepo.update(teamId, {
          leaderId: undefined,
          leaderCitizenName: undefined,
          leaderPhone: undefined,
        });
      } else {
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
          if (deputy.userId) {
            await this.teamRepo.update(teamId, { leaderId: deputy.userId });
          } else if (deputy.citizenName) {
            await this.teamRepo.update(teamId, {
              leaderId: undefined,
              leaderCitizenName: deputy.citizenName,
              leaderPhone: deputy.citizenPhone ?? undefined,
            });
          }
        } else {
          await this.teamRepo.update(teamId, {
            leaderId: undefined,
            leaderCitizenName: undefined,
            leaderPhone: undefined,
          });
        }
      }
    }

    await this.memberRepo.softDelete(member.id);
  }

  async getMembers(
    teamId: number,
    filters: { isActive?: boolean },
  ): Promise<{ items: RescueTeamMember[]; total: number }> {
    const result = await this.memberRepo.findByTeamId(teamId, filters);
    return {
      items: result.items as unknown as RescueTeamMember[],
      total: result.total,
    };
  }
}
