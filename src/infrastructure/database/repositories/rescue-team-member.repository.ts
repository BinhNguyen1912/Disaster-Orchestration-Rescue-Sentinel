import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { RescueTeamMember } from '@domain/entities/rescue-team-member';
import { IRescueTeamMemberRepository } from '@domain/repositories/rescue-team-member.repository.interface';
import { RescueTeamMemberEntity } from '../entities/rescue-team-member.entity';
import { BaseRepository } from './base.repository';
import type { PaginationOptions } from '@domain/repositories/rescue-team-member.repository.interface';
import { RoleInTeam } from '@domain/enums/roleInTeam.enum';

@Injectable()
export class RescueTeamMemberRepositoryImpl
  extends BaseRepository<RescueTeamMember, RescueTeamMemberEntity>
  implements IRescueTeamMemberRepository
{
  constructor(
    @InjectRepository(RescueTeamMemberEntity)
    private readonly repo: Repository<RescueTeamMemberEntity>,
  ) {
    super(repo);
  }

  protected toDomain(orm: RescueTeamMemberEntity): RescueTeamMember {
    const entity = new RescueTeamMember();
    Object.assign(entity, orm);
    return entity;
  }

  protected toOrmEntity(
    domain: Partial<RescueTeamMember>,
  ): Partial<RescueTeamMemberEntity> {
    const entity = new RescueTeamMemberEntity();
    Object.assign(entity, domain);
    return entity;
  }

  async findByUserId(userId: number): Promise<RescueTeamMember | null> {
    const entity = await this.repo.findOne({
      where: { userId, isActive: true },
      relations: ['team', 'team.province'],
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findByTeamId(
    teamId: number,
    filters?: { isActive?: boolean },
    pagination?: PaginationOptions,
  ): Promise<{ items: RescueTeamMember[]; total: number }> {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.repo
      .createQueryBuilder('rtm')
      .leftJoinAndSelect('rtm.user', 'user')
      .where('rtm.teamId = :teamId', { teamId });

    if (filters?.isActive !== undefined) {
      queryBuilder.andWhere('rtm.isActive = :isActive', {
        isActive: filters.isActive,
      });
    }

    const [items, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map((e) => this.toDomain(e)),
      total,
    };
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

  async findLeaderByTeamId(teamId: number): Promise<RescueTeamMember | null> {
    const entity = await this.repo.findOne({
      where: { teamId, roleInTeam: RoleInTeam.LEADER, isActive: true },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async update(
    id: number,
    data: Partial<RescueTeamMember>,
  ): Promise<RescueTeamMember | null> {
    const cleanData: Partial<RescueTeamMemberEntity> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        (cleanData as any)[key] = value;
      }
    }
    const result = await this.repo.save({ id, ...cleanData });
    return result ? this.toDomain(result) : null;
  }
}
