import { Province } from './province';
import { DisasterEvent } from './disaster-event';
import { User } from './user';
import { DonorType } from '../enums/donorType.enum';
import { DonationType } from '../enums/donationType.enum';
import { DonationStatus } from '../enums/donationStatus.enum';

export class Donation {
  id: number;
  provinceId: number;
  disasterEventId?: number;
  donorName?: string;
  donorPhone?: string;
  donorEmail?: string;
  donorUserId?: number;
  donorType: DonorType;
  isAnonymous: boolean;
  donationType: DonationType;
  amountVnd?: bigint;
  goodsDescription?: string;
  goodsQuantity?: string;
  status: DonationStatus;
  receivedAt?: Date;
  receivedBy?: number;
  receiptImageUrl?: string;
  distributedAt?: Date;
  distributedBy?: number;
  distributionNotes?: string;
  distributionImageUrl?: string;
  isPublic: boolean;
  message?: string;
  createdAt: Date;
  updatedAt: Date;
  province: Province;
  event?: DisasterEvent | null;
  donor?: User | null;
  receiver?: User | null;
  distributor?: User | null;
}
