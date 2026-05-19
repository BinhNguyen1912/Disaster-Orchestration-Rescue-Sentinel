import { RoleInTeam } from '../enums/roleInTeam.enum';
import { RescueTeam } from './rescue-team';
import { User } from './user';

export class RescueTeamMember {
  id: number;
  teamId: number;
  userId: number;
  roleInTeam: RoleInTeam;
  joinedAt: Date;
  leftAt?: Date;
  isActive: boolean;
  specializations: string;
  missionsCount: number;
  rescuedCount: number;
  hoursActive: number;
  team: RescueTeam;
  user: User;
}
