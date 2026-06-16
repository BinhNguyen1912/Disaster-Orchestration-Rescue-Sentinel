import { TeamStatus } from '@shared/core/enums/teamStatus.enum';
import { TeamType } from '@shared/core/enums/teamType.enum';
import { TeamSpecialization } from '@shared/domain/entities/team-specialization.entity';

export interface RescueTeam {
  id: number;
  provinceId: number;
  adminUnitId: number; // Đơn vị hành chính cấp xã/phường
  name: string;
  teamType?: TeamType; // Optional - for VOLUNTEER_SPONTANEOUS teams
  status: TeamStatus;
  currentLocation?: unknown;
  baseLocation?: unknown;
  coverageArea?: unknown;
  maxCapacity?: number;
  activeCasesCount: number;
  specializations?: TeamSpecialization[];
  leaderId?: number;
  leaderCitizenName?: string;
  leaderPhone?: string;
  logoUrl?: string | null;
  totalMissions: number;
  totalRescued: number;
  totalHoursActive: number;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: number;
}
