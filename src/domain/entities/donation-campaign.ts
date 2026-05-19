import { Province } from './province';
import { DisasterEvent } from './disaster-event';
import { User } from './user';
import { CampaignStatus } from '../enums/campaignStatus.enum';

export class DonationCampaign {
  id: number;
  provinceId: number;
  disasterEventId?: number;
  title: string;
  description?: string;
  targetAmountVnd?: bigint;
  currentAmountVnd: bigint;
  status: CampaignStatus;
  bankAccountNumber?: string;
  bankName?: string;
  bankAccountName?: string;
  qrCodeUrl?: string;
  startedAt: Date;
  endedAt?: Date;
  createdBy?: number;
  createdAt: Date;
  isPublic: boolean;
  province: Province;
  event?: DisasterEvent | null;
  creator?: User | null;
}
