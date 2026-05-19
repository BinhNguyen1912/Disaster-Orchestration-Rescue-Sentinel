import { Province } from './province';
import { User } from './user';
import { HouseholdProfile } from './household-profile';
import { RescueTeam } from './rescue-team';
import { DutyLog } from './duty-log';
import { SosRequest } from './sos-request';
import { FloodReport } from './flood-report';
import { Casualty } from './casualty';
import { FloodZone } from './flood-zone';
import { InfrastructureLayer } from './infrastructure-layer';
import { AdministrativeUnitType } from '../enums/administrativeUnitType.enum';

export class AdministrativeUnit {
  id: number;
  provinceId: number;
  parentId?: number;
  type: AdministrativeUnitType;
  code: string;
  name: string;
  boundary?: any // geometry;
  centerPoint?: any // geometry;
  province: Province;
  parent?: AdministrativeUnit | null;
  subUnits: AdministrativeUnit[];
  users: User[];
  householdProfiles: HouseholdProfile[];
  rescueTeams: RescueTeam[];
  dutyLogs: DutyLog[];
  sosRequests: SosRequest[];
  floodReports: FloodReport[];
  casualties: Casualty[];
  floodZones: FloodZone[];
  infrastructureLayers: InfrastructureLayer[];
}
