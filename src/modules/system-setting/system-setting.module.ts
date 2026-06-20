import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  SystemSettingEntity,
  SystemCategoryEntity,
} from '@infrastructure/database/entities';
import { SystemSettingService } from './application/services/system-setting.service';
import { SystemSettingController } from './presentation/controllers/system-setting.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([SystemSettingEntity, SystemCategoryEntity]),
  ],
  controllers: [SystemSettingController],
  providers: [SystemSettingService],
  exports: [SystemSettingService],
})
export class SystemSettingModule {}
