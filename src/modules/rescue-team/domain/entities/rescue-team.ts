import { TeamStatus } from '@shared/core/enums/teamStatus.enum';
import { TeamType } from '@shared/core/enums/teamType.enum';
import { TeamSpecialization } from './team-specialization';

export interface RescueTeam {
  id: number;
  provinceId: number;
  adminUnitId: number; // Đơn vị hành chính cấp xã/phường
  name: string;
  teamType: TeamType;
  status: TeamStatus;
  currentLocation?: unknown;
  baseLocation?: unknown;
  coverageArea?: unknown;
  maxCapacity?: number;
  activeCasesCount: number;
  specializations?: TeamSpecialization[];
  leaderId?: number;
  totalMissions: number;
  totalRescued: number;
  totalHoursActive: number;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: number;
}
