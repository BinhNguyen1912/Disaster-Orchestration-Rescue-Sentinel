import { PaginatedResult } from '../../../../shared/common/dtos/pagination.dto';
import { RescueTeamMember } from '../../domain/entities/rescue-team-member';
import type { AddMemberDto } from '../dtos/add-member.dto';
import type { UpdateMemberRoleDto } from '../dtos/update-member-role.dto';

export interface IRescueTeamMemberService {
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
