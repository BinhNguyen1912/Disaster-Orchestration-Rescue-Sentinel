import { SosRequestType } from '@shared/core/enums/sosType.enum';
import { SosStatus } from '@shared/core/enums/sosStatus.enum';
import { Severity } from '@shared/core/enums/level.enum';
import { SosSource } from '@shared/core/enums/sosSource.enum';
import { DispatchMethod } from '@shared/core/enums/dispatchMethod.enum';

export interface SosRequest {
  id: number;
  provinceId: number;
  adminUnitId: number;
  requesterId?: number | null;
  requesterName?: string | null;
  requesterPhone?: string | null;
  deviceId?: number | null;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  requestType: SosRequestType;
  status: SosStatus;
  severity: Severity;
  trappedPeopleCount: number;
  specialNeedsTags?: string[] | null;
  imageUrls: string[] | string;
  description?: string | null;
  source: SosSource;
  assignedTeamId?: number | null;
  assignedBy?: number | null;
  assignedAt?: Date | null;
  dispatchMethod?: DispatchMethod | null;
  resolvedAt?: Date | null;
  resolvedBy?: number | null;
  resolutionNotes?: string | null;
  clusterId?: number | null;
  requiresEquipment?: boolean;
  specialistPending?: boolean;
  specialistType?: string | null;
  pendingSince?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  province?: any;
  adminUnit?: any;
  user?: any;
  assignedTeam?: any;
  assigner?: any;
  resolver?: any;
  etaIdealMinutes?: number;
  etaRealisticMinutes?: number;
  trafficDelayMinutes?: number;
  trafficNote?: string;
  distanceKm?: number | null;
}
