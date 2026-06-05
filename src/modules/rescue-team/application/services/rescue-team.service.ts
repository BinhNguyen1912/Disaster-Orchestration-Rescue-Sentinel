import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import type { CreateRescueTeamDto } from '../dtos/create-rescue-team.dto';
import type { UpdateRescueTeamDto } from '../dtos/update-rescue-team.dto';
import type { UpdateRescueTeamLocationDto } from '../dtos/update-rescue-team-location.dto';
import type { QueryRescueTeamDto } from '../dtos/query.dto';
import {
  PaginationParams,
  PaginatedResult,
} from '../../../../shared/common/dtos/pagination.dto';
import type { IRescueTeamRepository } from '../../domain/repositories/rescue-team.repository.interface';
import type { ITeamSpecializationRepository } from '../../domain/repositories/team-specialization.repository.interface';
import type { IRescueTeamService } from '../interfaces/rescue-team.service.interface';
import type { IProvinceRepository } from '../../../location/domain/repositories/location.repository.interface';
import type { IWardRepository } from '../../../location/domain/repositories/location.repository.interface';
import { RescueTeam } from '../../domain/entities/rescue-team';
import { APP_MESSAGES } from '@shared/index';

@Injectable()
export class RescueTeamService implements IRescueTeamService {
  constructor(
    @Inject('IRescueTeamRepository')
    private readonly teamRepo: IRescueTeamRepository,
    @Inject('ITeamSpecializationRepository')
    private readonly specRepo: ITeamSpecializationRepository,
    @Inject('IProvinceRepository')
    private readonly provinceRepo: IProvinceRepository,
    @Inject('IWardRepository')
    private readonly wardRepo: IWardRepository,
  ) {}

  async create(dto: CreateRescueTeamDto, userId: number): Promise<RescueTeam> {
    const province = await this.provinceRepo.findById(dto.provinceId);
    if (!province) {
      throw new BadRequestException(APP_MESSAGES.RESCUE.INVALID_PROVINCE);
    }

    const adminUnit = await this.wardRepo.findById(dto.adminUnitId);
    if (!adminUnit) {
      throw new BadRequestException(APP_MESSAGES.RESCUE.INVALID_ADMIN_UNIT);
    }

    if (adminUnit.provinceId !== dto.provinceId) {
      throw new BadRequestException(
        APP_MESSAGES.RESCUE.ADMIN_UNIT_NOT_IN_PROVINCE,
      );
    }

    if (
      dto.teamType &&
      dto.specializationIds &&
      dto.specializationIds.length > 0
    ) {
      const specs = await this.specRepo.findByIds(dto.specializationIds);
      const invalid = specs.filter((s) => s.teamType !== dto.teamType);
      if (invalid.length > 0) {
        throw new BadRequestException(
          APP_MESSAGES.RESCUE.INVALID_SPECIALIZATION_FOR_TEAM_TYPE,
        );
      }
    }

    let specializations: any = [];
    if (dto.specializationIds && dto.specializationIds.length > 0) {
      specializations = await this.specRepo.findByIds(dto.specializationIds);
    }

    return this.teamRepo.create({
      ...dto,
      createdBy: userId,
      activeCasesCount: 0,
      totalMissions: 0,
      totalRescued: 0,
      totalHoursActive: 0,
      specializations,
    });
  }

  async findAll(
    filters: QueryRescueTeamDto,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<RescueTeam>> {
    return this.teamRepo.findAll(filters, {
      page: pagination.page || 1,
      limit: pagination.limit || 20,
    });
  }

  async findById(id: number): Promise<RescueTeam> {
    const team = await this.teamRepo.findById(id);
    if (!team) {
      throw new NotFoundException(APP_MESSAGES.RESCUE.RESCUE_TEAM_NOT_FOUND);
    }
    return team;
  }

  async update(id: number, dto: UpdateRescueTeamDto): Promise<RescueTeam> {
    const team = await this.teamRepo.update(id, dto);
    if (!team) {
      throw new NotFoundException(APP_MESSAGES.RESCUE.RESCUE_TEAM_NOT_FOUND);
    }
    return team;
  }

  async updateLocation(
    id: number,
    dto: UpdateRescueTeamLocationDto,
  ): Promise<RescueTeam> {
    const team = await this.teamRepo.update(id, {
      currentLocation: dto.currentLocation,
      ...(dto.status && { status: dto.status }),
    } as any);
    if (!team) {
      throw new NotFoundException(APP_MESSAGES.RESCUE.RESCUE_TEAM_NOT_FOUND);
    }
    return team;
  }

  async delete(id: number): Promise<void> {
    const team = await this.teamRepo.findById(id);
    if (!team) {
      throw new NotFoundException(APP_MESSAGES.RESCUE.RESCUE_TEAM_NOT_FOUND);
    }

    // Note: Active members check moved to RescueTeamMemberModule
    // This is because member count is managed by the member module

    await this.teamRepo.delete(id);
  }
}
