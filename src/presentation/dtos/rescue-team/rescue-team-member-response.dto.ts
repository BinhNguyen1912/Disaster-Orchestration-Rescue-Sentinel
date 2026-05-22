import { RoleInTeam } from '@domain/enums/roleInTeam.enum';

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
