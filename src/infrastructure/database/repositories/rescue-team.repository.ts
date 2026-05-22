import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { RescueTeam } from '@domain/entities/rescue-team';
import {
  IRescueTeamRepository,
  RescueTeamFilters,
  PaginationOptions,
  PaginatedResult,
} from '@domain/repositories/rescue-team.repository.interface';
import { RescueTeamEntity } from '../entities/rescue-team.entity';

@Injectable()
export class RescueTeamRepositoryImpl implements IRescueTeamRepository {
  constructor(
    @InjectRepository(RescueTeamEntity)
    private readonly repo: Repository<RescueTeamEntity>,
  ) {}

  private toDomain(orm: RescueTeamEntity): RescueTeam {
    const entity = new RescueTeam();
    Object.assign(entity, orm);
    return entity;
  }

  async findById(id: number): Promise<RescueTeam | null> {
    const entity = await this.repo.findOne({
      where: { id },
      relations: ['province', 'adminUnit', 'leader'],
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findAll(
    filters: RescueTeamFilters,
    pagination: PaginationOptions,
  ): Promise<PaginatedResult<RescueTeam>> {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    let queryBuilder = this.repo
      .createQueryBuilder('rt')
      .leftJoinAndSelect('rt.province', 'province')
      .leftJoinAndSelect('rt.adminUnit', 'adminUnit');

    queryBuilder = this.applyFilters(queryBuilder, filters);

    const [items, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map((e) => this.toDomain(e)),
      total,
    };
  }

  private applyFilters(
    queryBuilder: SelectQueryBuilder<RescueTeamEntity>,
    filters: RescueTeamFilters,
  ): SelectQueryBuilder<RescueTeamEntity> {
    if (filters.provinceId) {
      queryBuilder.andWhere('rt.provinceId = :provinceId', {
        provinceId: filters.provinceId,
      });
    }
    if (filters.status) {
      queryBuilder.andWhere('rt.status = :status', { status: filters.status });
    }
    if (filters.teamType) {
      queryBuilder.andWhere('rt.teamType = :teamType', {
        teamType: filters.teamType,
      });
    }
    if (filters.availableOnly) {
      queryBuilder.andWhere('rt.status = :status', { status: 'AVAILABLE' });
    }
    if (filters.search) {
      queryBuilder.andWhere('rt.name ILIKE :search', {
        search: `%${filters.search}%`,
      });
    }
    return queryBuilder;
  }

  async create(data: Partial<RescueTeam>): Promise<RescueTeam> {
    const ormEntity = this.repo.create(data as any);
    const saved = await this.repo.save(ormEntity);
    return this.toDomain(saved as unknown as RescueTeamEntity);
  }

  async update(
    id: number,
    data: Partial<RescueTeam>,
  ): Promise<RescueTeam | null> {
    const existing = await this.repo.findOne({ where: { id } });
    if (!existing) return null;

    const cleanData: Partial<RescueTeamEntity> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        (cleanData as any)[key] = value;
      }
    }

    const updated = await this.repo.save({ ...existing, ...cleanData });
    return this.toDomain(updated);
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.repo.delete(id);
    return result.affected ? result.affected > 0 : false;
  }

  async countActiveCases(teamId: number): Promise<number> {
    const result = await this.repo.count({
      where: { id: teamId, activeCasesCount: 0 },
    });
    return result;
  }
}
