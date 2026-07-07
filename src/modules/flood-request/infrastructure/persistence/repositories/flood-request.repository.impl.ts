import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FloodRequestEntity } from '@infrastructure/database/entities/flood-request.entity';
import { IFloodRequestRepository, QueryFloodRequestParams } from '../../../domain/repositories/flood-request.repository.interface';
import { FloodRequest } from '../../../domain/entities/flood-request.interface';
import { PaginatedResult } from '@shared/common/dtos/pagination.dto';

@Injectable()
export class FloodRequestRepositoryImpl implements IFloodRequestRepository {
  constructor(
    @InjectRepository(FloodRequestEntity)
    private readonly repo: Repository<FloodRequestEntity>,
  ) {}

  async findById(id: number | string): Promise<FloodRequest | null> {
    const queryBuilder = this.repo
      .createQueryBuilder('fr')
      .leftJoinAndSelect('fr.province', 'province')
      .leftJoinAndSelect('fr.adminUnit', 'adminUnit')
      .leftJoinAndSelect('fr.requester', 'requester')
      .leftJoinAndSelect('fr.reviewer', 'reviewer')
      .leftJoinAndSelect('fr.linkedSos', 'linkedSos')
      .addSelect('ST_X(fr.location::geometry)', 'frLng')
      .addSelect('ST_Y(fr.location::geometry)', 'frLat')
      .where('fr.id = :id', { id: Number(id) });

    const rawAndEntities = await queryBuilder.getRawAndEntities();
    if (rawAndEntities.entities.length === 0) return null;

    const entity = rawAndEntities.entities[0];
    this.mergeCoordinates(entity, rawAndEntities.raw[0]);
    return entity as any;
  }

  async findAll(options?: any): Promise<FloodRequest[]> {
    return this.repo.find(options) as any;
  }

  async create(data: Partial<FloodRequest>): Promise<FloodRequest> {
    const entity = this.repo.create(data as any);
    const saved = await this.repo.save(entity);
    return saved as any;
  }

  async createMany(data: Partial<FloodRequest>[]): Promise<FloodRequest[]> {
    const entities = this.repo.create(data as any[]);
    const saved = await this.repo.save(entities);
    return saved as any[];
  }

  async update(
    id: number | string,
    data: Partial<FloodRequest>,
  ): Promise<FloodRequest | null> {
    const existing = await this.repo.findOne({ where: { id: Number(id) } });
    if (!existing) return null;
    Object.assign(existing, data);
    const saved = await this.repo.save(existing);
    return saved as any;
  }

  async delete(id: number | string): Promise<boolean> {
    const result = await this.repo.delete(Number(id));
    return (result.affected ?? 0) > 0;
  }

  async findAndCount(options?: any): Promise<[FloodRequest[], number]> {
    const [entities, count] = await this.repo.findAndCount(options);
    return [entities as any[], count];
  }

  async findAllPaginated(
    filters: QueryFloodRequestParams,
    pagination: { page: number; limit: number },
  ): Promise<PaginatedResult<FloodRequest>> {
    const { page, limit } = pagination;
    const {
      provinceId,
      status,
      purpose,
      requesterId,
      isApprovedForMap,
    } = filters;

    const queryBuilder = this.repo
      .createQueryBuilder('fr')
      .leftJoinAndSelect('fr.province', 'province')
      .leftJoinAndSelect('fr.adminUnit', 'adminUnit')
      .leftJoinAndSelect('fr.requester', 'requester')
      .leftJoinAndSelect('fr.reviewer', 'reviewer')
      .leftJoinAndSelect('fr.linkedSos', 'linkedSos')
      .addSelect('ST_X(fr.location::geometry)', 'frLng')
      .addSelect('ST_Y(fr.location::geometry)', 'frLat');

    if (provinceId) {
      queryBuilder.andWhere('fr.provinceId = :provinceId', { provinceId });
    }
    if (status) {
      queryBuilder.andWhere('fr.status = :status', { status });
    }
    if (purpose) {
      queryBuilder.andWhere('fr.purpose = :purpose', { purpose });
    }
    if (requesterId) {
      queryBuilder.andWhere('fr.requesterId = :requesterId', { requesterId });
    }
    if (isApprovedForMap !== undefined) {
      queryBuilder.andWhere('fr.isApprovedForMap = :isApprovedForMap', { isApprovedForMap });
    }

    const countQb = queryBuilder.clone();
    const total = await countQb.getCount();

    const rawAndEntities = await queryBuilder
      .orderBy('fr.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getRawAndEntities();

    rawAndEntities.entities.forEach((entity, index) => {
      this.mergeCoordinates(entity, rawAndEntities.raw[index]);
    });

    return {
      items: rawAndEntities.entities as any[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private mergeCoordinates(entity: any, raw: any): void {
    if (!entity || !raw) return;
    entity.lat = parseFloat(raw.frLat) || null;
    entity.lng = parseFloat(raw.frLng) || null;
  }
}
