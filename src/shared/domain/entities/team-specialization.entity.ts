import { TeamType } from '@shared/core/enums/teamType.enum';
export interface TeamSpecialization {
  id: number;
  name: string;
  teamType: TeamType;
  description?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
