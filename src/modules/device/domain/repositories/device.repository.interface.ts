import { IBaseRepository } from '@shared/domain/repositories/base.repository.interface';
import { DeviceEntity } from '@infrastructure/database/entities/device.entity';

export interface IDeviceRepository extends IBaseRepository<DeviceEntity> {
  findByDeviceId(deviceId: string): Promise<DeviceEntity | null>;
  findByUserId(userId: number): Promise<DeviceEntity[]>;
}
