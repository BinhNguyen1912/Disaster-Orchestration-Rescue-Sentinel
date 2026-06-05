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

  async findAll(filters?: {
    teamType?: any;
    isActive?: boolean;
  }): Promise<TeamSpecializationEntity[]> {
    const queryBuilder = this.repo.createQueryBuilder('spec');

    if (filters?.teamType) {
      queryBuilder.andWhere('spec.teamType = :teamType', {
        teamType: filters.teamType,
      });
    }

    if (filters?.isActive !== undefined) {
      queryBuilder.andWhere('spec.isActive = :isActive', {
        isActive: filters.isActive,
      });
    }

    return queryBuilder.getMany();
  }

  async findByIds(ids: number[]): Promise<TeamSpecializationEntity[]> {
    if (ids.length === 0) return [];
    return this.repo.find({ where: { id: In(ids) } });
  }

  async create(
    data: Partial<TeamSpecializationEntity>,
  ): Promise<TeamSpecializationEntity> {
    return this.repo.save(this.repo.create(data));
  }

  async update(
    id: number,
    data: Partial<TeamSpecializationEntity>,
  ): Promise<TeamSpecializationEntity | null> {
    const existing = await this.repo.findOne({ where: { id } });
    if (!existing) return null;
    return this.repo.save({ ...existing, ...data });
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.repo.delete(id);
    return result.affected ? result.affected > 0 : false;
  }

  async softDelete(id: number): Promise<boolean> {
    const result = await this.repo.update(id, { isActive: false });
    return result.affected ? result.affected > 0 : false;
  }
}
