export class RescueTeamResponseDto {
  id: number;
  name: string;
  teamType: string;
  status: string;
  provinceId: number;
  adminUnitId: number;
  leaderId?: number;
  baseLocation?: any;
  coverageArea?: any;
  maxCapacity?: number;
  equipment?: Record<string, any>;
  activeCasesCount: number;
  totalMissions: number;
  totalRescued: number;
  totalHoursActive: number;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(entity: any): RescueTeamResponseDto {
    const dto = new RescueTeamResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.teamType = entity.teamType;
    dto.status = entity.status;
    dto.provinceId = entity.provinceId;
    dto.adminUnitId = entity.adminUnitId;
    dto.leaderId = entity.leaderId;
    dto.baseLocation = entity.baseLocation;
    dto.coverageArea = entity.coverageArea;
    dto.maxCapacity = entity.maxCapacity;
    dto.equipment = entity.equipment;
    dto.activeCasesCount = entity.activeCasesCount;
    dto.totalMissions = entity.totalMissions;
    dto.totalRescued = entity.totalRescued;
    dto.totalHoursActive = entity.totalHoursActive;
    dto.createdBy = entity.createdBy;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
