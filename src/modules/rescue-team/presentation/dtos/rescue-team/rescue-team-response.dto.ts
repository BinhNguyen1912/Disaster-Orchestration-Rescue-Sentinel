import { TeamType } from '@shared/core/enums/teamType.enum';
import { TeamStatus } from '@shared/core/enums/teamStatus.enum';

export class RescueTeamResponseDto {
  id: number;
  provinceId: number;
  adminUnitId: number;
  name: string;
  teamType: TeamType;
  status: TeamStatus;
  baseLocation?: any;
  maxCapacity?: number;
  activeCasesCount: number;
  specializationIds: number[];
  leaderId?: number;
  totalMissions: number;
  totalRescued: number;
  totalHoursActive: number;
  createdAt: Date;
  updatedAt: Date;
}
