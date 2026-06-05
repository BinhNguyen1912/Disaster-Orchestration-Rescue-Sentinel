import { RoleInTeam } from '@shared/core/enums/roleInTeam.enum';

export interface RescueTeamMember {
  id: number;
  teamId: number;
  userId: number | null;
  citizenName: string | null;
  citizenPhone: string | null;
  roleInTeam: RoleInTeam;
  joinedAt: Date;
  leftAt?: Date;
  isActive: boolean;
  specializationIds?: number[];
  missionsCount: number;
  rescuedCount: number;
  hoursActive: number;
}
