import { RescueTeamMemberEntity } from '@infrastructure/database/entities/rescue-team-member.entity';

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

export interface IRescueTeamMemberRepository {
  findById(id: number): Promise<RescueTeamMemberEntity | null>;
  findByUserId(userId: number): Promise<RescueTeamMemberEntity | null>;
  findByTeamId(
    teamId: number,
    filters?: { isActive?: boolean },
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<RescueTeamMemberEntity>>;
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
