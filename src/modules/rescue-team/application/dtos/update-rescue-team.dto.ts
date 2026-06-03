import { TeamType } from '@shared/core/enums/teamType.enum';
import { TeamStatus } from '@shared/core/enums/teamStatus.enum';

export interface UpdateRescueTeamDto {
  name?: string;
  teamType?: TeamType;
  status?: TeamStatus;
  activeCasesCount?: number;
  maxCapacity?: number;
  equipment?: Record<string, any>;
  coverageArea?: { type: 'Polygon'; coordinates: number[][][] };
}
