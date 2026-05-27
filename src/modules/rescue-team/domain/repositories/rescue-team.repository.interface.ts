import { RescueTeamEntity } from '@infrastructure/database/entities/rescue-team.entity';

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

export interface RescueTeamFilters {
  provinceId?: number;
  status?: string;
  teamType?: string;
  search?: string;
  availableOnly?: boolean;
}

export interface IRescueTeamRepository {
  findById(id: number): Promise<RescueTeamEntity | null>;
  findAll(
    filters: RescueTeamFilters,
    pagination: PaginationOptions,
  ): Promise<PaginatedResult<RescueTeamEntity>>;
  create(data: Partial<RescueTeamEntity>): Promise<RescueTeamEntity>;
  update(
    id: number,
    data: Partial<RescueTeamEntity>,
  ): Promise<RescueTeamEntity | null>;
  delete(id: number): Promise<boolean>;
  countActiveCases(teamId: number): Promise<number>;
}
