export interface QueryRescueTeamDto {
  provinceId?: number;
  adminUnitId?: number;
  teamType?: string;
  status?: string;
  isActive?: boolean;
  search?: string;
  availableOnly?: boolean;
}
