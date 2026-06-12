import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SosRequestEntity } from '@infrastructure/database/entities/sos-request.entity';
import {
  ISosRequestRepository,
  QuerySosParams,
} from '../../../domain/repositories/sos-request.repository.interface';
import { SosRequest } from '../../../domain/entities/sos-request.entity';
import { SosStatus } from '@shared/core/enums/sosStatus.enum';
import { PaginatedResult } from '@shared/common/dtos/pagination.dto';

@Injectable()
export class SosRequestRepositoryImpl implements ISosRequestRepository {
  constructor(
    @InjectRepository(SosRequestEntity)
    private readonly repo: Repository<SosRequestEntity>,
  ) {}

  async findById(id: number | string): Promise<SosRequest | null> {
    return this.repo.findOne({
      where: { id: Number(id) },
      relations: [
        'province',
        'adminUnit',
        'user',
        'iotDevice',
        'assignedTeam',
        'assigner',
        'resolver',
      ],
    });
  }

  async findAll(options?: any): Promise<SosRequest[]> {
    return this.repo.find(options);
  }

  async create(data: Partial<SosRequest>): Promise<SosRequest> {
    const entity = this.repo.create(data as any);
    return this.repo.save(entity) as any;
  }

  async createMany(data: Partial<SosRequest>[]): Promise<SosRequest[]> {
    const entities = this.repo.create(data as any[]);
    return this.repo.save(entities);
  }

  async update(
    id: number | string,
    data: Partial<SosRequest>,
  ): Promise<SosRequest | null> {
    const existing = await this.repo.findOne({ where: { id: Number(id) } });
    if (!existing) return null;
    Object.assign(existing, data);
    return this.repo.save(existing);
  }

  async delete(id: number | string): Promise<boolean> {
    const result = await this.repo.delete(Number(id));
    return (result.affected ?? 0) > 0;
  }

  async findAndCount(options?: any): Promise<[SosRequest[], number]> {
    return this.repo.findAndCount(options);
  }

  async findNearby(
    lat: number,
    lng: number,
    radiusKm: number,
    status?: SosStatus,
  ): Promise<(SosRequest & { distance_km: number })[]> {
    const query = this.repo
      .createQueryBuilder('sos')
      .addSelect(
        'ST_Distance(sos.location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography) / 1000',
        'distance_km',
      )
      .where(
        'ST_DWithin(sos.location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radiusMeters)',
        {
          lng,
          lat,
          radiusMeters: radiusKm * 1000,
        },
      );

    if (status) {
      query.andWhere('sos.status = :status', { status });
    }

    query.orderBy('distance_km', 'ASC');

    const rawAndEntities = await query.getRawAndEntities();

    return rawAndEntities.entities.map((entity, index) => {
      const raw = rawAndEntities.raw[index];
      const distance_km = parseFloat(raw.distance_km);
      return {
        ...entity,
        distance_km,
      } as any;
    });
  }

  async findAllPaginated(
    filters: QuerySosParams,
    pagination: { page: number; limit: number },
  ): Promise<PaginatedResult<SosRequest>> {
    const { page, limit } = pagination;
    const {
      provinceId,
      status,
      requestType,
      severity,
      assignedTeamId,
      requesterId,
    } = filters;

    const queryBuilder = this.repo
      .createQueryBuilder('sos')
      .leftJoinAndSelect('sos.province', 'province')
      .leftJoinAndSelect('sos.adminUnit', 'adminUnit')
      .leftJoinAndSelect('sos.user', 'user')
      .leftJoinAndSelect('sos.assignedTeam', 'assignedTeam');

    if (provinceId) {
      queryBuilder.andWhere('sos.provinceId = :provinceId', { provinceId });
    }
    if (status) {
      queryBuilder.andWhere('sos.status = :status', { status });
    }
    if (requestType) {
      queryBuilder.andWhere('sos.requestType = :requestType', { requestType });
    }
    if (severity) {
      queryBuilder.andWhere('sos.severity = :severity', { severity });
    }
    if (assignedTeamId) {
      queryBuilder.andWhere('sos.assignedTeamId = :assignedTeamId', {
        assignedTeamId,
      });
    }
    if (requesterId) {
      queryBuilder.andWhere('sos.requesterId = :requesterId', { requesterId });
    }

    const [items, total] = await queryBuilder
      .orderBy('sos.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
