import { RescueTeam } from './rescue-team';
import { User } from './user';
import { Province } from './province';
import { AdministrativeUnit } from './administrative-unit';
import { DutyStatus } from '../enums/dutyStatus.enum';

export class DutyLog {
  id: number;
  teamId: number;
  userId: number;
  provinceId: number;
  adminUnitId: number;
  dutyStart: Date;
  dutyEnd?: Date;
  status: DutyStatus;
  sosReceived: number;
  sosResolved: number;
  rescuedCount: number;
  notes?: string;
  createdAt: Date;
  team: RescueTeam;
  user: User;
  province: Province;
  adminUnit: AdministrativeUnit;
}
