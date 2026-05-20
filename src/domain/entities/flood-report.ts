import { Province } from './province';
import { AdministrativeUnit } from './administrative-unit';
import { User } from './user';
import { FloodReportType } from '../enums/floodReportType.enum';
import { ReportStatus } from '../enums/reportStatus.enum';

export class FloodReport {
  id: number;
  provinceId: number;
  adminUnitId: number;
  reporterId: number;
  location: any; // geometry;
  reportType: FloodReportType;
  waterDepthCm?: number;
  imageUrls: string;
  description?: string;
  status: ReportStatus;
  verifiedBy?: number;
  verifiedAt?: Date;
  confirmationCount: number;
  isCommunityAlert: boolean;
  createdAt: Date;
  province: Province;
  adminUnit: AdministrativeUnit;
  reporter: User;
  verifier?: User | null;
}
