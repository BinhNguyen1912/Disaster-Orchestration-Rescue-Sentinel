import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, EntityManager } from 'typeorm';
import {
  IRescueTeamRepository,
  RescueTeamFilters,
  PaginationOptions,
} from '../../../domain/repositories/rescue-team.repository.interface';
import { PaginatedResult } from '../../../../../shared/common/dtos/pagination.dto';
import { RescueTeamEntity } from '@infrastructure/database/entities/rescue-team.entity';

@Injectable()
export class RescueTeamRepositoryImpl implements IRescueTeamRepository {
  constructor(
    @InjectRepository(RescueTeamEntity)
    private readonly repo: Repository<RescueTeamEntity>,
  ) {}

  async findById(id: number): Promise<RescueTeamEntity | null> {
    const queryBuilder = this.repo
      .createQueryBuilder('rt')
      .leftJoinAndSelect('rt.province', 'province')
      .leftJoinAndSelect('rt.adminUnit', 'adminUnit')
      .leftJoinAndSelect('rt.specializations', 'specializations')
      .leftJoinAndSelect('rt.members', 'members')
      .leftJoinAndSelect('rt.leader', 'leader')
      .addSelect('ST_X(rt."currentLocation"::geometry)', 'currentLocationLng')
      .addSelect('ST_Y(rt."currentLocation"::geometry)', 'currentLocationLat')
      .addSelect('ST_X(rt."baseLocation"::geometry)', 'baseLocationLng')
      .addSelect('ST_Y(rt."baseLocation"::geometry)', 'baseLocationLat')
      .where('rt.id = :id', { id });

    const rawAndEntities = await queryBuilder.getRawAndEntities();
    if (rawAndEntities.entities.length === 0) return null;

    const entity = rawAndEntities.entities[0];
    const raw = rawAndEntities.raw[0];
    this.mergeCoordinates(entity, raw);
    return entity;
  }

  async findAll(
    filters: RescueTeamFilters,
    pagination: PaginationOptions,
  ): Promise<PaginatedResult<RescueTeamEntity>> {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    let queryBuilder = this.repo
      .createQueryBuilder('rt')
      .leftJoinAndSelect('rt.province', 'province')
      .leftJoinAndSelect('rt.adminUnit', 'adminUnit')
      .leftJoinAndSelect('rt.specializations', 'specializations')
      .leftJoinAndSelect('rt.members', 'members')
      .leftJoinAndSelect('rt.leader', 'leader')
      .addSelect('ST_X(rt."currentLocation"::geometry)', 'currentLocationLng')
      .addSelect('ST_Y(rt."currentLocation"::geometry)', 'currentLocationLat')
      .addSelect('ST_X(rt."baseLocation"::geometry)', 'baseLocationLng')
      .addSelect('ST_Y(rt."baseLocation"::geometry)', 'baseLocationLat');

    queryBuilder = this.applyFilters(queryBuilder, filters);

    const rawAndEntities = await queryBuilder
      .skip(skip)
      .take(limit)
      .getRawAndEntities();

    rawAndEntities.entities.forEach((entity, index) => {
      this.mergeCoordinates(entity, rawAndEntities.raw[index]);
    });

    const total = rawAndEntities.raw.length > 0
      ? await queryBuilder.clone().getCount()
      : 0;

    return {
      items: rawAndEntities.entities,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private mergeCoordinates(entity: RescueTeamEntity, raw: any): void {
    if (!entity || !raw) return;
    // Set lat/lng from raw SQL expressions for frontend convenience
    (entity as any).lng = parseFloat(raw.currentLocationLng) || null;
    (entity as any).lat = parseFloat(raw.currentLocationLat) || null;
    (entity as any).baseLng = parseFloat(raw.baseLocationLng) || null;
    (entity as any).baseLat = parseFloat(raw.baseLocationLat) || null;
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
    if (filters.adminUnitId) {
      queryBuilder.andWhere('rt.adminUnitId = :adminUnitId', {
        adminUnitId: filters.adminUnitId,
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

  async create(data: Partial<RescueTeamEntity>): Promise<RescueTeamEntity> {
    return this.repo.save(this.repo.create(data));
  }

  async update(
    id: number,
    data: Partial<RescueTeamEntity>,
  ): Promise<RescueTeamEntity | null> {
    const existing = await this.repo.findOne({ where: { id } });
    if (!existing) return null;
    return this.repo.save({ ...existing, ...data });
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

  async findNearestAvailable(
    lat: number,
    lng: number,
    provinceId: number,
  ): Promise<RescueTeamEntity | null> {
    return this.repo
      .createQueryBuilder('rt')
      .where('rt.provinceId = :provinceId', { provinceId })
      .andWhere('rt.status IN (:...statuses)', {
        statuses: ['AVAILABLE', 'STANDBY'],
      })
      .orderBy(
        `ST_Distance(rt."currentLocation", ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326))`,
        'ASC',
      )
      .getOne();
  }

  async findAvailableTeamsInRadius(
    lat: number,
    lng: number,
    radiusMeters: number,
    provinceId: number,
  ): Promise<(RescueTeamEntity & { distance_meters: number })[]> {
    const point = `ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)`;

    const query = this.repo
      .createQueryBuilder('rt')
      .addSelect(
        `ST_Distance(rt."currentLocation"::geography, ${point}::geography)`,
        'distance_meters',
      )
      .where('rt.provinceId = :provinceId', { provinceId })
      .andWhere('rt.status IN (:...statuses)', {
        statuses: ['AVAILABLE', 'STANDBY'],
      })
      .andWhere(
        `ST_DWithin(rt."currentLocation"::geography, ${point}::geography, ${radiusMeters})`,
      )
      .orderBy(`rt."currentLocation" <-> ${point}`);

    const rawAndEntities = await query.getRawAndEntities();

    return rawAndEntities.entities.map((entity, index) => {
      const raw = rawAndEntities.raw[index];
      const distance_meters = parseFloat(raw.distance_meters || '0');
      return Object.assign(entity, { distance_meters });
    });
  }

  async findCandidatesInRadiusWithLock(
    lat: number,
    lng: number,
    radiusMeters: number,
    provinceId: number,
    limit: number,
  ): Promise<(RescueTeamEntity & { distance_meters: number })[]> {
    const point = `ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)`;

    const query = this.repo
      .createQueryBuilder('rt')
      .addSelect(
        `ST_Distance(rt."currentLocation"::geography, ${point}::geography)`,
        'distance_meters',
      )
      .where('rt.provinceId = :provinceId', { provinceId })
      .andWhere('rt.status IN (:...statuses)', {
        statuses: ['AVAILABLE', 'STANDBY'],
      })
      .andWhere(
        `ST_DWithin(rt."currentLocation"::geography, ${point}::geography, ${radiusMeters})`,
      ) //chỉ lấy các đội trong bán kính
      .orderBy(`rt."currentLocation" <-> ${point}`) //sắp xếp theo khoảng cách
      .limit(limit) //chỉ lấy số lượng đội tối đa
      .setLock('pessimistic_write') //khóa bản ghi
      .setOnLocked('skip_locked'); //nếu đang có team khác xử lý thì bỏ qua

    const rawAndEntities = await query.getRawAndEntities();

    return rawAndEntities.entities.map((entity, index) => {
      const raw = rawAndEntities.raw[index];
      const distance_meters = parseFloat(raw.distance_meters || '0');
      return Object.assign(entity, { distance_meters });
    });
  }

  async lockTeamForUpdate(
    teamId: number,
    manager: EntityManager,
  ): Promise<RescueTeamEntity | null> {
    const team = await manager
      .createQueryBuilder(RescueTeamEntity, 'rt')
      .setLock('pessimistic_write') //khóa bản ghi
      .where('rt.id = :teamId', { teamId })
      .getOne();

    return team ?? null;
  }
}
