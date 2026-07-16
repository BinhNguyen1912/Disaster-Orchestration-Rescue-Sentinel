import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeviceEntity } from '@infrastructure/database/entities/device.entity';
import { RefreshTokenEntity } from '@infrastructure/database/entities/refresh-token.entity';
import { DeviceService } from './application/services/device.service';
import { DeviceController } from './presentation/controllers/device.controller';
import { DeviceRepositoryImpl } from './infrastructure/persistence/repositories/device.repository';

@Module({
  imports: [TypeOrmModule.forFeature([DeviceEntity, RefreshTokenEntity])],
  controllers: [DeviceController],
  providers: [
    DeviceService,
    {
      provide: 'IDeviceRepository',
      useClass: DeviceRepositoryImpl,
    },
  ],
  exports: [DeviceService],
})
export class DeviceModule {}
