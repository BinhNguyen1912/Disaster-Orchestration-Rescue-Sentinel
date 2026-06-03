export class RescueTeamMemberResponseDto {
  id: number;
  teamId: number;
  userId: number;
  roleInTeam: string;
  joinedAt: Date;
  isActive: boolean;
  missionsCount: number;
  rescuedCount: number;
  hoursActive: number;

  static fromEntity(entity: any): RescueTeamMemberResponseDto {
    const dto = new RescueTeamMemberResponseDto();
    dto.id = entity.id;
    dto.teamId = entity.teamId;
    dto.userId = entity.userId;
    dto.roleInTeam = entity.roleInTeam;
    dto.joinedAt = entity.joinedAt;
    dto.isActive = entity.isActive;
    dto.missionsCount = entity.missionsCount;
    dto.rescuedCount = entity.rescuedCount;
    dto.hoursActive = entity.hoursActive;
    return dto;
  }
}
