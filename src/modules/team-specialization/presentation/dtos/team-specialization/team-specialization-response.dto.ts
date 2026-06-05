import { TeamType } from '@shared/core/enums/teamType.enum';

export class TeamSpecializationResponseDto {
  id: number;
  name: string;
  teamType: TeamType;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(entity: any): TeamSpecializationResponseDto {
    const dto = new TeamSpecializationResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.teamType = entity.teamType;
    dto.description = entity.description;
    dto.isActive = entity.isActive;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
