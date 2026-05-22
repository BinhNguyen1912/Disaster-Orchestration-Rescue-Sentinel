import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { TeamSpecialization } from '@domain/entities/team-specialization';
import { ITeamSpecializationRepository } from '@domain/repositories/team-specialization.repository.interface';
import { TeamSpecializationEntity } from '../entities/team-specialization.entity';
import { BaseRepository } from './base.repository';

@Injectable()
export class TeamSpecializationRepositoryImpl
  extends BaseRepository<TeamSpecialization, TeamSpecializationEntity>
  implements ITeamSpecializationRepository
{
  constructor(
    @InjectRepository(TeamSpecializationEntity)
    private readonly repo: Repository<TeamSpecializationEntity>,
  ) {
    super(repo);
  }

  protected toDomain(orm: TeamSpecializationEntity): TeamSpecialization {
    const entity = new TeamSpecialization();
    Object.assign(entity, orm);
    return entity;
  }

  protected toOrmEntity(
    domain: Partial<TeamSpecialization>,
  ): Partial<TeamSpecializationEntity> {
    const entity = new TeamSpecializationEntity();
    Object.assign(entity, domain);
    return entity;
  }

  async findByIds(ids: number[]): Promise<TeamSpecialization[]> {
    if (ids.length === 0) return [];
    const entities = await this.repo.find({ where: { id: In(ids) } });
    return entities.map((e) => this.toDomain(e));
  }

  async findByTeamType(teamType: string): Promise<TeamSpecialization[]> {
    const entities = await this.repo.find({
      where: { teamType: teamType as any },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findAll(): Promise<TeamSpecialization[]> {
    const entities = await this.repo.find();
    return entities.map((e) => this.toDomain(e));
  }
}
