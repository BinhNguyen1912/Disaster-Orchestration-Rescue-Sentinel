import { TeamSpecializationEntity } from '@infrastructure/database/entities/team-specialization.entity';

export interface ITeamSpecializationRepository {
  findById(id: number): Promise<TeamSpecializationEntity | null>;
  findByIds(ids: number[]): Promise<TeamSpecializationEntity[]>;
  findByTeamType(teamType: string): Promise<TeamSpecializationEntity[]>;
  findAll(): Promise<TeamSpecializationEntity[]>;
}
