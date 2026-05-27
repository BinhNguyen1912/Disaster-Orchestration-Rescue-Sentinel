import { Injectable, Inject } from '@nestjs/common';
import type { ITeamSpecializationRepository } from '../../domain/repositories/team-specialization.repository.interface';
import { TeamSpecializationEntity } from '@infrastructure/database/entities/team-specialization.entity';

@Injectable()
export class TeamSpecializationService {
  constructor(
    @Inject('ITeamSpecializationRepository')
    private readonly specializationRepo: ITeamSpecializationRepository,
  ) {}

  async findAll(teamType?: string): Promise<TeamSpecializationEntity[]> {
    if (teamType) {
      return this.specializationRepo.findByTeamType(teamType);
    }
    return this.specializationRepo.findAll();
  }

  async findByIds(ids: number[]): Promise<TeamSpecializationEntity[]> {
    return this.specializationRepo.findByIds(ids);
  }
}
