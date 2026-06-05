import { TeamSpecialization } from '@shared/domain/entities/team-specialization.entity';
import {
  CreateTeamSpecializationDto,
  UpdateTeamSpecializationDto,
} from '../dtos/team-specialization.dto';

export interface ITeamSpecializationService {
  create(dto: CreateTeamSpecializationDto): Promise<TeamSpecialization>;
  findAll(filters?: {
    teamType?: string;
    isActive?: boolean;
  }): Promise<TeamSpecialization[]>;
  findById(id: number): Promise<TeamSpecialization>;
  findByIds(ids: number[]): Promise<TeamSpecialization[]>;
  update(
    id: number,
    dto: UpdateTeamSpecializationDto,
  ): Promise<TeamSpecialization>;
  delete(id: number): Promise<void>;
}
