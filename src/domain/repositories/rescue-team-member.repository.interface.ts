import { RescueTeamMember } from '@domain/entities/rescue-team-member';

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

export interface IRescueTeamMemberRepository {
  findById(id: number): Promise<RescueTeamMember | null>;
  findByUserId(userId: number): Promise<RescueTeamMember | null>;
  findByTeamId(
    teamId: number,
    filters?: { isActive?: boolean },
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<RescueTeamMember>>;
  create(data: Partial<RescueTeamMember>): Promise<RescueTeamMember>;
  update(
    id: number,
    data: Partial<RescueTeamMember>,
  ): Promise<RescueTeamMember | null>;
  softDelete(id: number): Promise<boolean>;
  countActiveMembers(teamId: number): Promise<number>;
  findLeaderByTeamId(teamId: number): Promise<RescueTeamMember | null>;
}
