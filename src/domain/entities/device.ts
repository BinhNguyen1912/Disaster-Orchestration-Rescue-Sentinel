import { User } from './user';

export class Device {
  id: number;
  userId: number;
  deviceId: string;
  fcmToken?: string;
  deviceType?: string;
  deviceModel?: string;
  osVersion?: string;
  lastActiveAt: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  user: User;
}
