import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LocationService } from './application/services/location.service';
import { LocationController } from './presentation/controllers/location.controller';

import { ProvinceEntity } from '@infrastructure/database/entities/province.entity';
import { AdministrativeUnitEntity } from '@infrastructure/database/entities/administrative-unit.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProvinceEntity, AdministrativeUnitEntity]),
  ],
  controllers: [LocationController],
  providers: [LocationService],
  exports: [LocationService],
})
export class LocationModule {}
