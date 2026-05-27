import { RoleInTeam } from '@shared/core/enums/roleInTeam.enum';

export class RescueTeamMemberResponseDto {
  id: number;
  teamId: number;
  userId: number;
  roleInTeam: RoleInTeam;
  joinedAt: Date;
  leftAt?: Date;
  isActive: boolean;
  missionsCount: number;
  rescuedCount: number;
  hoursActive: number;
}
