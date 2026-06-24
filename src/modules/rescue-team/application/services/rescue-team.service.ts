import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  OnModuleInit,
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
import { LocationService } from '../../../location/application/services/location.service';
import { APP_MESSAGES } from '@shared/index';
import { ConfigService } from '@nestjs/config';
import { TeamType } from '@shared/core/enums/teamType.enum';
import * as https from 'https';

function fetchCoords(
  query: string,
): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    // Remove administrative terms to make Nominatim queries more accurate
    const cleanedQuery = query
      .replace(/^(Xã|Phường|Thị trấn|Quận|Huyện|Thành phố|Tỉnh)\s+/gi, '')
      .replace(/,\s*(Xã|Phường|Thị trấn|Quận|Huyện|Thành phố|Tỉnh)\s+/gi, ', ');

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanedQuery + ', Vietnam')}&limit=1`;
    const options = {
      headers: {
        'User-Agent': 'RescueSystem/1.0',
      },
    };

    https
      .get(url, options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const results = JSON.parse(data);
            if (results && results.length > 0) {
              resolve({
                lat: parseFloat(results[0].lat),
                lng: parseFloat(results[0].lon),
              });
            } else {
              resolve(null);
            }
          } catch (e) {
            resolve(null);
          }
        });
        res.on('error', () => resolve(null));
      })
      .on('error', () => resolve(null));
  });
}

@Injectable()
export class RescueTeamService implements IRescueTeamService, OnModuleInit {
  constructor(
    @Inject('IRescueTeamRepository')
    private readonly teamRepo: IRescueTeamRepository,
    @Inject('ITeamSpecializationRepository')
    private readonly specRepo: ITeamSpecializationRepository,
    @Inject('IProvinceRepository')
    private readonly provinceRepo: IProvinceRepository,
    @Inject('IWardRepository')
    private readonly wardRepo: IWardRepository,
    private readonly configService: ConfigService,
    private readonly locationService: LocationService,
  ) {}

  async create(dto: CreateRescueTeamDto, userId: number): Promise<RescueTeam> {
    let provinceId = dto.provinceId;
    let adminUnitId = dto.adminUnitId;

    if ((!provinceId || !adminUnitId) && dto.baseLocation?.coordinates) {
      const [lng, lat] = dto.baseLocation.coordinates;
      const resolvedUnit = await this.locationService.findUnitByCoordinates(
        lat,
        lng,
      );
      if (resolvedUnit) {
        provinceId = resolvedUnit.provinceId;
        adminUnitId = resolvedUnit.id;
      }
    }

    if (!provinceId) {
      throw new BadRequestException(APP_MESSAGES.RESCUE.INVALID_PROVINCE);
    }
    const province = await this.provinceRepo.findById(provinceId);
    if (!province) {
      throw new BadRequestException(APP_MESSAGES.RESCUE.INVALID_PROVINCE);
    }

    if (!adminUnitId) {
      throw new BadRequestException(APP_MESSAGES.RESCUE.INVALID_ADMIN_UNIT);
    }
    const adminUnit = await this.wardRepo.findById(adminUnitId);
    if (!adminUnit) {
      throw new BadRequestException(APP_MESSAGES.RESCUE.INVALID_ADMIN_UNIT);
    }

    if (adminUnit.provinceId !== provinceId) {
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

    let baseLocation = dto.baseLocation;
    if (!baseLocation && adminUnit && province) {
      const addressQuery = `${adminUnit.name}, ${province.name}`;
      try {
        const coords = await fetchCoords(addressQuery);
        if (coords) {
          baseLocation = {
            type: 'Point',
            coordinates: [coords.lng, coords.lat],
          };
        }
      } catch (e) {
        console.error('Failed to geocode new team address:', e);
      }
    }

    const createdTeam = await this.teamRepo.create({
      ...dto,
      provinceId,
      adminUnitId,
      createdBy: userId,
      specializations,
      baseLocation,
      currentLocation: baseLocation,
    });
    return this.populateLogoFallback(createdTeam);
  }

  async onModuleInit() {
    // Run after a short delay to allow server boot to settle
    setTimeout(() => {
      this.geocodeMissingTeams().catch((err) => {
        console.error('Failed to geocode missing teams on startup:', err);
      });
    }, 5000);
  }

  private async geocodeMissingTeams() {
    console.log('[Geocoding] Checking for rescue teams missing coordinates...');
    const result = await this.teamRepo.findAll(
      {},
      {
        page: 1,
        limit: 1000,
      },
    );
    const teams = result.items || [];
    const missingTeams = teams.filter((t) => !t.baseLocation);

    if (missingTeams.length === 0) {
      console.log('[Geocoding] All rescue teams have coordinates.');
      return;
    }

    console.log(
      `[Geocoding] Found ${missingTeams.length} teams missing baseLocation. Geocoding...`,
    );

    for (let i = 0; i < missingTeams.length; i++) {
      const team = missingTeams[i];
      const adminUnitName = (team as any).adminUnit?.name || '';
      const provinceName = (team as any).province?.name || '';
      if (!adminUnitName && !provinceName) continue;

      const addressQuery = `${adminUnitName}, ${provinceName}`;
      console.log(
        `[Geocoding] [${i + 1}/${missingTeams.length}] Geocoding team: ${team.name} using address "${addressQuery}"`,
      );

      try {
        const coords = await fetchCoords(addressQuery);
        if (coords) {
          await this.teamRepo.update(team.id, {
            baseLocation: {
              type: 'Point',
              coordinates: [coords.lng, coords.lat],
            },
            currentLocation: {
              type: 'Point',
              coordinates: [coords.lng, coords.lat],
            },
          });
          console.log(
            `[Geocoding] Successfully updated team ${team.name} to coordinates [${coords.lng}, ${coords.lat}]`,
          );
        } else {
          console.warn(
            `[Geocoding] Could not find coordinates for: "${addressQuery}"`,
          );
        }
      } catch (err: any) {
        console.error(
          `[Geocoding] Error geocoding team ${team.name}:`,
          err.message,
        );
      }

      // Nominatim rate limiting policy is 1 request per second max
      if (i < missingTeams.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }
    }
    console.log('[Geocoding] Finished geocoding missing teams.');
  }

  async findAll(
    filters: QueryRescueTeamDto,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<RescueTeam>> {
    const result = await this.teamRepo.findAll(filters, {
      page: pagination.page || 1,
      limit: pagination.limit || 20,
    });
    if (result.items) {
      result.items = result.items.map((team) =>
        this.populateLogoFallback(team),
      );
    }
    return result;
  }

  async findById(id: number): Promise<RescueTeam> {
    const team = await this.teamRepo.findById(id);
    if (!team) {
      throw new NotFoundException(APP_MESSAGES.RESCUE.RESCUE_TEAM_NOT_FOUND);
    }
    return this.populateLogoFallback(team);
  }

  async update(id: number, dto: UpdateRescueTeamDto): Promise<RescueTeam> {
    const existing = await this.teamRepo.findById(id);
    if (!existing) {
      throw new NotFoundException(APP_MESSAGES.RESCUE.RESCUE_TEAM_NOT_FOUND);
    }

    let baseLocation = dto.baseLocation;

    // Auto geocode if location fields changed and baseLocation is not explicitly provided
    const isProvinceChanged =
      dto.provinceId && dto.provinceId !== existing.provinceId;
    const isAdminUnitChanged =
      dto.adminUnitId && dto.adminUnitId !== existing.adminUnitId;

    if ((isProvinceChanged || isAdminUnitChanged) && !baseLocation) {
      const provinceId = dto.provinceId || existing.provinceId;
      const adminUnitId = dto.adminUnitId || existing.adminUnitId;

      const province = await this.provinceRepo.findById(provinceId);
      const adminUnit = await this.wardRepo.findById(adminUnitId);

      if (province && adminUnit) {
        const addressQuery = `${adminUnit.name}, ${province.name}`;
        try {
          const coords = await fetchCoords(addressQuery);
          if (coords) {
            baseLocation = {
              type: 'Point',
              coordinates: [coords.lng, coords.lat],
            };
          }
        } catch (e) {
          console.error('Failed to geocode team address on update:', e);
        }
      }
    }

    const team = await this.teamRepo.update(id, {
      ...dto,
      ...(baseLocation && { baseLocation, currentLocation: baseLocation }),
    });
    if (!team) {
      throw new NotFoundException(APP_MESSAGES.RESCUE.RESCUE_TEAM_NOT_FOUND);
    }
    return this.populateLogoFallback(team);
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
    return this.populateLogoFallback(team);
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

  private populateLogoFallback(team: RescueTeam): RescueTeam {
    if (!team) return team;
    if (!team.logoUrl) {
      const pcccLogo =
        this.configService.get<string>('DEFAULT_LOGO_PCCC') || '';
      const yteLogo = this.configService.get<string>('DEFAULT_LOGO_YTE') || '';
      const volunteerLogo =
        this.configService.get<string>('DEFAULT_LOGO_VOLUNTEER') || '';
      const generalLogo =
        this.configService.get<string>('DEFAULT_LOGO_GENERAL') || '';

      team.logoUrl =
        team.teamType === TeamType.PCCC
          ? pcccLogo
          : team.teamType === TeamType.Y_TE
            ? yteLogo
            : team.teamType === TeamType.TINH_NGUYEN
              ? volunteerLogo
              : generalLogo;
    }
    return team;
  }
}
