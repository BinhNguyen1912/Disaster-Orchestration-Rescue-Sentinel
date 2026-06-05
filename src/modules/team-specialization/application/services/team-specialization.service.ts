import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { ITeamSpecializationRepository } from '../../domain/repositories/team-specialization.repository.interface';
import type {
  CreateTeamSpecializationDto,
  UpdateTeamSpecializationDto,
} from '../dtos/team-specialization.dto';
import type { TeamSpecialization } from '@shared/domain/entities/team-specialization.entity';
import { ITeamSpecializationService } from '../interfaces/team-specialization.interface';
import { TeamType } from '@shared/index';

@Injectable()
export class TeamSpecializationService implements ITeamSpecializationService {
  constructor(
    @Inject('ITeamSpecializationRepository')
    private readonly repo: ITeamSpecializationRepository,
  ) {}

  async create(dto: CreateTeamSpecializationDto): Promise<TeamSpecialization> {
    return this.repo.create({
      ...dto,
      isActive: dto.isActive ?? true,
    });
  }

  async findAll(filters?: {
    teamType?: TeamType;
    isActive?: boolean;
  }): Promise<TeamSpecialization[]> {
    return this.repo.findAll(filters);
  }

  async findById(id: number): Promise<TeamSpecialization> {
    const specialization = await this.repo.findById(id);
    if (!specialization) {
      throw new NotFoundException(
        `Team specialization with id ${id} not found`,
      );
    }
    return specialization;
  }

  async findByIds(ids: number[]): Promise<TeamSpecialization[]> {
    return this.repo.findByIds(ids);
  }

  async update(
    id: number,
    dto: UpdateTeamSpecializationDto,
  ): Promise<TeamSpecialization> {
    const updated = await this.repo.update(id, dto);
    if (!updated) {
      throw new NotFoundException(
        `Team specialization with id ${id} not found`,
      );
    }
    return updated;
  }

  async delete(id: number): Promise<void> {
    const specialization = await this.repo.findById(id);
    if (!specialization) {
      throw new NotFoundException(
        `Team specialization with id ${id} not found`,
      );
    }
    await this.repo.softDelete(id);
  }
}
