import { RoleInTeam } from '@shared/core/enums/roleInTeam.enum';
import { TeamStatus } from '@shared/core/enums/teamStatus.enum';
import { TeamType } from '@shared/core/enums/teamType.enum';

export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number];
}

export interface GeoPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface CreateRescueTeamInput {
  provinceId: number;
  name: string;
  teamType: TeamType;
  adminUnitId: number;
  baseLocation?: GeoPoint;
  coverageArea?: GeoPolygon;
  maxCapacity?: number;
  specializationIds?: number[];
}

export interface UpdateRescueTeamInput {
  name?: string;
  status?: TeamStatus;
  currentLocation?: GeoPoint;
  maxCapacity?: number;
  specializationIds?: number[];
}

export interface UpdateRescueTeamLocationInput {
  currentLocation: GeoPoint;
  status?: TeamStatus;
}

export interface AddMemberInput {
  userId: number;
  roleInTeam: RoleInTeam;
  specializationIds?: number[];
}

export interface UpdateMemberRoleInput {
  roleInTeam: RoleInTeam;
}
