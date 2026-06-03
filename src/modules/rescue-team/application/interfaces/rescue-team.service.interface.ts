import {
  PaginatedResult,
  PaginationParams,
} from '../../../../shared/common/dtos/pagination.dto';
import { RescueTeam } from '../../domain/entities/rescue-team';
import { RescueTeamMember } from '../../domain/entities/rescue-team-member';
import type { CreateRescueTeamDto } from '../dtos/create-rescue-team.dto';
import type { UpdateRescueTeamDto } from '../dtos/update-rescue-team.dto';
import type { UpdateRescueTeamLocationDto } from '../dtos/update-rescue-team-location.dto';
import type { AddMemberDto } from '../dtos/add-member.dto';
import type { UpdateMemberRoleDto } from '../dtos/update-member-role.dto';
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
  addMember(teamId: number, dto: AddMemberDto): Promise<RescueTeamMember>;
  removeMember(teamId: number, memberId: number): Promise<void>;
  updateMemberRole(
    teamId: number,
    memberId: number,
    dto: UpdateMemberRoleDto,
  ): Promise<RescueTeamMember>;
  leaveTeam(userId: number): Promise<void>;
  getMembers(
    teamId: number,
    filters: { isActive?: boolean },
  ): Promise<PaginatedResult<RescueTeamMember>>;
}
