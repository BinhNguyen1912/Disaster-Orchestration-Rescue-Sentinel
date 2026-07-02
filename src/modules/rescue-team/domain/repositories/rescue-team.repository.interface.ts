import { PaginatedResult } from '../../../../shared/common/dtos/pagination.dto';
import { RescueTeam } from '../entities/rescue-team';
import type { EntityManager } from 'typeorm';

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface RescueTeamFilters {
  provinceId?: number;
  adminUnitId?: number;
  status?: string;
  teamType?: string;
  search?: string;
  availableOnly?: boolean;
}

export interface IRescueTeamRepository {
  findById(id: number): Promise<RescueTeam | null>;
  findAll(
    filters: RescueTeamFilters,
    pagination: PaginationOptions,
  ): Promise<PaginatedResult<RescueTeam>>;
  create(data: Partial<RescueTeam>): Promise<RescueTeam>;
  update(id: number, data: Partial<RescueTeam>): Promise<RescueTeam | null>;
  delete(id: number): Promise<boolean>;
  countActiveCases(teamId: number): Promise<number>;
  findNearestAvailable(
    lat: number,
    lng: number,
    provinceId: number,
  ): Promise<RescueTeam | null>;
  findAvailableTeamsInRadius(
    lat: number,
    lng: number,
    radiusMeters: number,
    provinceId: number,
  ): Promise<(RescueTeam & { distance_meters: number })[]>;

  // Tìm ứng viên trong bán kính với SKIP LOCKED — đội đang bị lock bởi
  // transaction khác sẽ bị bỏ qua (tránh blocking trong bão SOS đồng thời).
  findCandidatesInRadiusWithLock(
    lat: number,
    lng: number,
    radiusMeters: number,
    provinceId: number,
    limit: number,
  ): Promise<(RescueTeam & { distance_meters: number })[]>;

  // Lock 1 đội cụ thể bằng FOR UPDATE trong transaction ngắn (Pha commit).
  // Trả null nếu đội không tồn tại.
  lockTeamForUpdate(
    teamId: number,
    manager: EntityManager,
  ): Promise<RescueTeam | null>;
}
