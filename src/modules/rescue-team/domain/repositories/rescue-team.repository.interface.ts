import { PaginatedResult } from '../../../../shared/common/dtos/pagination.dto';
import { RescueTeam } from '../entities/rescue-team';

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface RescueTeamFilters {
  provinceId?: number;
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
}
