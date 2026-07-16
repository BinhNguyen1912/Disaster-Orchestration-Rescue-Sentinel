import { DeviceEntity } from '@infrastructure/database/entities/device.entity';
import { RegisterDeviceDto } from '../dtos/device.dto';

export interface IDeviceService {
  registerDevice(userId: number, dto: RegisterDeviceDto): Promise<DeviceEntity>;
  getUserDevicesAndSessions(userId: number, currentUserAgent?: string, currentIp?: string): Promise<any[]>;
  deleteDevice(id: number, userId: number): Promise<void>;
  revokeSession(tokenId: number, userId: number): Promise<void>;
  revokeAllDevicesAndSessions(userId: number): Promise<void>;
}
