import { TeamStatus } from '@shared/core/enums/teamStatus.enum';
import { TeamType } from '@shared/core/enums/teamType.enum';

export interface RescueTeam {
  id: number;
  provinceId: number;
  adminUnitId: number;
  name: string;
  teamType: TeamType;
  status: TeamStatus;
  currentLocation?: unknown;
  baseLocation?: unknown;
  coverageArea?: unknown;
  maxCapacity?: number;
  activeCasesCount: number;
  specializations?: string | string[];
  equipment?: unknown;
  leaderId?: number;
  totalMissions: number;
  totalRescued: number;
  totalHoursActive: number;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: number;
}
