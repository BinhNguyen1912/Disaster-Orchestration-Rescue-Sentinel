import { TeamType } from '@shared/core/enums/teamType.enum';
import { TeamStatus } from '@shared/core/enums/teamStatus.enum';

export interface UpdateRescueTeamDto {
  name?: string;
  teamType?: TeamType;
  status?: TeamStatus;
  activeCasesCount?: number;
  maxCapacity?: number;
  specializationIds?: number[];
  logoUrl?: string;
  provinceId?: number;
  adminUnitId?: number;
  baseLocation?: { type: 'Point'; coordinates: [number, number] };
  email?: string;
  foundingDate?: Date | string;
  baseLocationAddress?: string;
  coverageAreaSize?: number;
}
