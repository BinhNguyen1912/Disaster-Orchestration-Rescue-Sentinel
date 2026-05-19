import { Province } from './province';
import { AdministrativeUnit } from './administrative-unit';
import { User } from './user';
import { FloodFrequency } from '../enums/floodFrequency.enum';
import { FloodReason } from '../enums/floodReason.enum';

export class FloodZone {
  id: number;
  provinceId: number;
  adminUnitId: number;
  name: string;
  boundary: any // geometry;
  severityLevel: number;
  floodFrequency: FloodFrequency;
  avgDepthCm?: number;
  lastFloodedAt?: Date;
  floodReason?: FloodReason | null;
  notes?: string;
  lastUpdated: Date;
  updatedBy?: number;
  province: Province;
  adminUnit: AdministrativeUnit;
  updater?: User | null;
}
