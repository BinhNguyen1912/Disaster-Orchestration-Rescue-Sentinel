import { Severity } from '@shared/core/enums/level.enum';
import { FloodRequestPurpose } from '@shared/core/enums/floodRequestPurpose.enum';
import { FloodRequestStatus } from '@shared/core/enums/floodRequestStatus.enum';
import { DispatchMethod } from '@shared/core/enums/dispatchMethod.enum';
import { SosSource } from '@shared/core/enums/sosSource.enum';

export interface FloodRequest {
  id: number;
  title: string;
  description?: string | null;
  requesterId?: number | null;
  requesterName: string;
  requesterPhone: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  provinceId: number;
  adminUnitId: number;
  locationName?: string | null;
  addressDetail?: string | null;
  severity: Severity;
  floodDepthCmMin?: number | null;
  floodDepthCmMax?: number | null;
  estimatedAreaHa?: number | null;
  roadType?: string | null;
  impact?: string | null;
  weather?: string | null;
  notes?: string | null;
  imageUrls: string[];
  purpose: FloodRequestPurpose;
  status: FloodRequestStatus;
  isApprovedForMap: boolean;
  reviewedBy?: number | null;
  reviewedAt?: Date | null;
  reviewNotes?: string | null;
  linkedSosId?: number | null;
  dispatchMethod?: DispatchMethod | null;
  source: SosSource;
  deviceInfo?: string | null;
  createdAt: Date;
  updatedAt: Date;

  province?: any;
  adminUnit?: any;
  requester?: any;
  reviewer?: any;
  linkedSos?: any;
  statusHistory?: any[];

  lat?: number | null;
  lng?: number | null;
}
