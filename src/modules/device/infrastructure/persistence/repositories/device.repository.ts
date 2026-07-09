import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceEntity } from '@infrastructure/database/entities/device.entity';
import { BaseRepository } from '@shared/infrastructure/persistence/base.repository';
import { IDeviceRepository } from '../../../domain/repositories/device.repository.interface';

@Injectable()
export class DeviceRepositoryImpl
  extends BaseRepository<DeviceEntity, DeviceEntity>
  implements IDeviceRepository
{
  constructor(
    @InjectRepository(DeviceEntity)
    private readonly deviceRepository: Repository<DeviceEntity>,
  ) {
    super(deviceRepository);
  }

  protected toDomain(ormEntity: DeviceEntity): DeviceEntity {
    return ormEntity;
  }

  protected toOrmEntity(domainEntity: Partial<DeviceEntity>): any {
    return domainEntity;
  }

  async findByDeviceId(deviceId: string): Promise<DeviceEntity | null> {
    return this.deviceRepository.findOne({ where: { deviceId } });
  }

  async findByUserId(userId: number): Promise<DeviceEntity[]> {
    return this.deviceRepository.find({
      where: { userId },
      order: { lastActiveAt: 'DESC' },
    });
  }
}
