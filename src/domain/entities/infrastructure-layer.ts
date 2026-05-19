import { Province } from './province';
import { AdministrativeUnit } from './administrative-unit';
import { User } from './user';
import { InfraType } from '../enums/infraType.enum';
import { InfraStatus } from '../enums/infraStatus.enum';

export class InfrastructureLayer {
  id: number;
  provinceId: number;
  adminUnitId: number;
  type: InfraType;
  name: string;
  location: any // geometry;
  status: InfraStatus;
  lastDredgedAt?: Date;
  lastFloodedAt?: Date;
  lastMaintainedAt?: Date;
  notes?: string;
  updatedBy?: number;
  createdAt: Date;
  province: Province;
  adminUnit: AdministrativeUnit;
  updater?: User | null;
}
