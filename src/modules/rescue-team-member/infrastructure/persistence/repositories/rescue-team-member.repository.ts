import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IRescueTeamMemberRepository } from '../../../domain/repositories/rescue-team-member.repository.interface';
import { RescueTeamMemberEntity } from '@infrastructure/database/entities/rescue-team-member.entity';
import { RoleInTeam } from '@shared/core/enums/roleInTeam.enum';

@Injectable()
export class RescueTeamMemberRepositoryImpl implements IRescueTeamMemberRepository {
  constructor(
    @InjectRepository(RescueTeamMemberEntity)
    private readonly repo: Repository<RescueTeamMemberEntity>,
  ) {}

  async findById(id: number): Promise<RescueTeamMemberEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByUserId(userId: number): Promise<RescueTeamMemberEntity | null> {
    if (!userId) return null;
    return this.repo.findOne({
      where: { userId, isActive: true },
      relations: ['team', 'team.province'],
    });
  }

  async findByTeamId(
    teamId: number,
    filters?: { isActive?: boolean },
    pagination?: { page: number; limit: number },
  ): Promise<{ items: RescueTeamMemberEntity[]; total: number }> {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    const isActive = filters?.isActive;

    const queryBuilder = this.repo
      .createQueryBuilder('rtm')
      .leftJoinAndSelect('rtm.user', 'user')
      .where('rtm.teamId = :teamId', { teamId });

    if (isActive !== undefined) {
      queryBuilder.andWhere('rtm.isActive = :isActive', { isActive });
    }

    const [items, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, total };
  }

  async findByCitizenInfo(
    teamId: number,
    citizenName: string,
    citizenPhone?: string,
  ): Promise<RescueTeamMemberEntity | null> {
    const queryBuilder = this.repo
      .createQueryBuilder('rtm')
      .where('rtm.teamId = :teamId', { teamId })
      .andWhere('rtm.citizenName = :citizenName', { citizenName })
      .andWhere('rtm.isActive = :isActive', { isActive: true });

    if (citizenPhone) {
      queryBuilder.andWhere('rtm.citizenPhone = :citizenPhone', {
        citizenPhone,
      });
    }

    return queryBuilder.getOne();
  }

  async create(
    data: Partial<RescueTeamMemberEntity>,
  ): Promise<RescueTeamMemberEntity> {
    return this.repo.save(this.repo.create(data));
  }

  async update(
    id: number,
    data: Partial<RescueTeamMemberEntity>,
  ): Promise<RescueTeamMemberEntity | null> {
    const existing = await this.repo.findOne({ where: { id } });
    if (!existing) return null;
    return this.repo.save({ ...existing, ...data });
  }

  async softDelete(id: number): Promise<boolean> {
    const result = await this.repo.update(id, {
      isActive: false,
      leftAt: new Date(),
    });
    return result.affected ? result.affected > 0 : false;
  }

  async countActiveMembers(teamId: number): Promise<number> {
    return this.repo.count({ where: { teamId, isActive: true } });
  }

  async findLeaderByTeamId(
    teamId: number,
  ): Promise<RescueTeamMemberEntity | null> {
    return this.repo.findOne({
      where: { teamId, roleInTeam: RoleInTeam.LEADER, isActive: true },
    });
  }
}
