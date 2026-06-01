import { TeamType } from '@shared/core/enums/teamType.enum';

export interface TeamSpecialization {
  id: number;
  code: string;
  name: string;
  teamType: TeamType;
  description?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
