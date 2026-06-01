import { Injectable, Inject } from '@nestjs/common';
import type { ITeamSpecializationRepository } from '../../domain/repositories/team-specialization.repository.interface';
import { TeamSpecialization } from '../../domain/entities/team-specialization';

@Injectable()
export class TeamSpecializationService {
  constructor(
    @Inject('ITeamSpecializationRepository')
    private readonly specializationRepo: ITeamSpecializationRepository,
  ) {}

  async findAll(teamType?: string): Promise<TeamSpecialization[]> {
    if (teamType) {
      return this.specializationRepo.findByTeamType(teamType);
    }
    return this.specializationRepo.findAll();
  }

  async findByIds(ids: number[]): Promise<TeamSpecialization[]> {
    return this.specializationRepo.findByIds(ids);
  }
}
