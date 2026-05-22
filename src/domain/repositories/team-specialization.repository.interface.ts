import { TeamSpecialization } from '@domain/entities/team-specialization';

export interface ITeamSpecializationRepository {
  findById(id: number): Promise<TeamSpecialization | null>;
  findByIds(ids: number[]): Promise<TeamSpecialization[]>;
  findByTeamType(teamType: string): Promise<TeamSpecialization[]>;
  findAll(): Promise<TeamSpecialization[]>;
}
