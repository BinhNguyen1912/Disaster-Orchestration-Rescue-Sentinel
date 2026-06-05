import { RescueTeamMemberEntity } from '@infrastructure/database/entities/rescue-team-member.entity';

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
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
  ): Promise<{ items: RescueTeamMemberEntity[]; total: number }>;
  findByCitizenInfo(
    teamId: number,
    citizenName: string,
    citizenPhone?: string,
  ): Promise<RescueTeamMemberEntity | null>;
  findLeaderByTeamId(teamId: number): Promise<RescueTeamMemberEntity | null>;
  countActiveMembers(teamId: number): Promise<number>;
  create(
    data: Partial<RescueTeamMemberEntity>,
  ): Promise<RescueTeamMemberEntity>;
  update(
    id: number,
    data: Partial<RescueTeamMemberEntity>,
  ): Promise<RescueTeamMemberEntity | null>;
  softDelete(id: number): Promise<boolean>;
}
