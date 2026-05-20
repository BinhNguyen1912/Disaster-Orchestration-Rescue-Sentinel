import { User } from './user';
import { Province } from './province';
import { AdministrativeUnit } from './administrative-unit';
import { AssetValueLevel, WaterUsageLevel } from '../enums/level.enum';

export class HouseholdProfile {
  id: number;
  residentId: number;
  provinceId: number;
  adminUnitId: number;
  addressDetail?: string;
  homeLocation?: any; // geometry;
  floorCount?: number;
  totalMembers: number;
  elderlyCount: number;
  childrenCount: number;
  pregnantCount: number;
  disabledCount: number;
  hasChronicIllness: boolean;
  healthNotes?: string;
  assetValueLevel?: AssetValueLevel | null;
  businessType?: string;
  waterUsageLevel?: WaterUsageLevel | null;
  productionType?: string;
  nearManhole: boolean;
  nearWasteSite: boolean;
  nearProduction: boolean;
  nearCanal: boolean;
  envNotes?: string;
  createdAt: Date;
  updatedAt: Date;
  updatedBy?: number;
  resident: User;
  province: Province;
  adminUnit: AdministrativeUnit;
}
