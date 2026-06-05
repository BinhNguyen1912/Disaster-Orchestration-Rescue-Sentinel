import {
  PaginatedResult,
  PaginationParams,
} from '../../../../shared/common/dtos/pagination.dto';
import { RescueTeam } from '../../domain/entities/rescue-team';
import type { CreateRescueTeamDto } from '../dtos/create-rescue-team.dto';
import type { UpdateRescueTeamDto } from '../dtos/update-rescue-team.dto';
import type { UpdateRescueTeamLocationDto } from '../dtos/update-rescue-team-location.dto';
import type { QueryRescueTeamDto } from '../dtos/query.dto';

export interface IRescueTeamService {
  create(dto: CreateRescueTeamDto, userId: number): Promise<RescueTeam>;
  findAll(
    filters: QueryRescueTeamDto,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<RescueTeam>>;
  findById(id: number): Promise<RescueTeam>;
  update(id: number, dto: UpdateRescueTeamDto): Promise<RescueTeam>;
  updateLocation(
    id: number,
    dto: UpdateRescueTeamLocationDto,
  ): Promise<RescueTeam>;
  delete(id: number): Promise<void>;
}
