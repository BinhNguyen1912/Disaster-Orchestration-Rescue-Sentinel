import { TeamType } from '../enums/teamType.enum';

export class TeamSpecialization {
  id: number;
  code: string;
  name: string;
  teamType: TeamType;
  description?: string;
  isActive: boolean;
}
