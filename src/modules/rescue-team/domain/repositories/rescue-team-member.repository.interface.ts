import { PaginatedResult } from '../../../../shared/common/dtos/pagination.dto';
import { RescueTeamMemberEntity } from '@infrastructure/database/entities/rescue-team-member.entity';

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface IRescueTeamMemberRepository {
  findById(id: number): Promise<RescueTeamMemberEntity | null>;
  findByUserId(userId: number): Promise<RescueTeamMemberEntity | null>;
  findByTeamId(
    teamId: number,
    filters?: { isActive?: boolean },
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<RescueTeamMemberEntity>>;
  findByCitizenInfo(
    teamId: number,
    citizenName: string,
    citizenPhone?: string,
  ): Promise<RescueTeamMemberEntity | null>;
  create(
    data: Partial<RescueTeamMemberEntity>,
  ): Promise<RescueTeamMemberEntity>;
  update(
    id: number,
    data: Partial<RescueTeamMemberEntity>,
  ): Promise<RescueTeamMemberEntity | null>;
  softDelete(id: number): Promise<boolean>;
  countActiveMembers(teamId: number): Promise<number>;
  findLeaderByTeamId(teamId: number): Promise<RescueTeamMemberEntity | null>;
}
