import { Province } from './province';
import { User } from './user';
import { Donation } from './donation';
import { DonationCampaign } from './donation-campaign';
import { DisasterEventType } from '../enums/disasterEventType.enum';
import { EventStatus } from '../enums/eventStatus.enum';

export class DisasterEvent {
  id: number;
  provinceId: number;
  name: string;
  eventType: DisasterEventType;
  startedAt: Date;
  endedAt?: Date;
  affectedArea?: any // geometry;
  totalDeceased: number;
  totalInjured: number;
  totalMissing: number;
  totalSafe: number;
  totalEvacuated: number;
  estimatedDamageVnd?: bigint;
  housesDamaged: number;
  housesDestroyed: number;
  cropsDamageHa: number;
  status: EventStatus;
  createdBy?: number;
  createdAt: Date;
  updatedAt: Date;
  province: Province;
  creator?: User | null;
  donations: Donation[];
  campaigns: DonationCampaign[];
}
