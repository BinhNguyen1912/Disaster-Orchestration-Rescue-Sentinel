import { TeamType } from '@shared/index';
import { TeamSpecialization } from '@shared/domain/entities/team-specialization.entity';

export interface ITeamSpecializationRepository {
  findById(id: number): Promise<TeamSpecialization | null>;
  findByIds(ids: number[]): Promise<TeamSpecialization[]>;
  findAll(filters?: {
    teamType?: TeamType;
    isActive?: boolean;
  }): Promise<TeamSpecialization[]>;
}
