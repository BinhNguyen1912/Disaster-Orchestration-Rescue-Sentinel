import { TeamType } from '@shared/core/enums/teamType.enum';

export interface CreateRescueTeamDto {
  provinceId: number;
  name: string;
  teamType?: TeamType; // Optional - only required for PROFESSIONAL teams
  adminUnitId: number;
  baseLocation?: { type: 'Point'; coordinates: [number, number] };
  coverageArea?: { type: 'Polygon'; coordinates: number[][][] };
  maxCapacity?: number;
  specializationIds?: number[];
  logoUrl?: string;
}
