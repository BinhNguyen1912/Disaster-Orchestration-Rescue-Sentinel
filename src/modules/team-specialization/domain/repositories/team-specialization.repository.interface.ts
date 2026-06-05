import { TeamType } from '@shared/index';
import { TeamSpecialization } from '@shared/domain/entities/team-specialization.entity';

export interface ITeamSpecializationRepository {
  findById(id: number): Promise<TeamSpecialization | null>;
  findByIds(ids: number[]): Promise<TeamSpecialization[]>;
  findAll(filters?: {
    teamType?: TeamType;
    isActive?: boolean;
  }): Promise<TeamSpecialization[]>;
  create(data: Partial<TeamSpecialization>): Promise<TeamSpecialization>;
  update(
    id: number,
    data: Partial<TeamSpecialization>,
  ): Promise<TeamSpecialization | null>;
  delete(id: number): Promise<boolean>;
  softDelete(id: number): Promise<boolean>;
}
