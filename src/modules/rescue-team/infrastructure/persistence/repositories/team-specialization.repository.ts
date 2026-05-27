import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ITeamSpecializationRepository } from '../../../domain/repositories/team-specialization.repository.interface';
import { TeamSpecializationEntity } from '@infrastructure/database/entities/team-specialization.entity';

@Injectable()
export class TeamSpecializationRepositoryImpl implements ITeamSpecializationRepository {
  constructor(
    @InjectRepository(TeamSpecializationEntity)
    private readonly repo: Repository<TeamSpecializationEntity>,
  ) {}

  async findById(id: number): Promise<TeamSpecializationEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findAll(): Promise<TeamSpecializationEntity[]> {
    return this.repo.find();
  }

  async findByIds(ids: number[]): Promise<TeamSpecializationEntity[]> {
    if (ids.length === 0) return [];
    return this.repo.find({ where: { id: In(ids) } });
  }

  async findByTeamType(teamType: string): Promise<TeamSpecializationEntity[]> {
    return this.repo.find({ where: { teamType: teamType as any } });
  }
}
