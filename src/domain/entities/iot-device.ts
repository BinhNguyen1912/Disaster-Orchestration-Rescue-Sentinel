import { Province } from './province';
import { User } from './user';
import { SosRequest } from './sos-request';

export class IotDevice {
  id: number;
  provinceId: number;
  serialNumber: string;
  ownerId?: number;
  lastLocation?: any // geometry;
  lastSeenAt?: Date;
  batteryLevel?: number;
  simPhoneNumber?: string;
  isActive: boolean;
  firmwareVersion?: string;
  province: Province;
  owner?: User | null;
  sosRequests: SosRequest[];
}
