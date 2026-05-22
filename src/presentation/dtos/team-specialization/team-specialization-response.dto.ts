import { TeamType } from '@domain/enums/teamType.enum';

export class TeamSpecializationResponseDto {
  id: number;
  code: string;
  name: string;
  teamType: TeamType;
  description?: string;
  isActive: boolean;
}
