import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './presentation/controllers/dashboard.controller';
import { DashboardService } from './application/services/dashboard.service';
import { HouseholdProfileEntity } from '@infrastructure/database/entities/household-profile.entity';
import { RescueTeamEntity } from '@infrastructure/database/entities/rescue-team.entity';
import { SosRequestEntity } from '@infrastructure/database/entities/sos-request.entity';
import { DisasterEventEntity } from '@infrastructure/database/entities/disaster-event.entity';
import { DonationEntity } from '@infrastructure/database/entities/donation.entity';
import { RescueEquipmentEntity } from '@infrastructure/database/entities/rescue-equipment.entity';
import { CasualtyEntity } from '@infrastructure/database/entities/casualty.entity';
import { UserEntity } from '@infrastructure/database/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HouseholdProfileEntity,
      RescueTeamEntity,
      SosRequestEntity,
      DisasterEventEntity,
      DonationEntity,
      RescueEquipmentEntity,
      CasualtyEntity,
      UserEntity,
    ]),
  ],
  controllers: [DashboardController],
  providers: [
    {
      provide: 'IDashboardService',
      useClass: DashboardService,
    },
    DashboardService,
  ],
  exports: [DashboardService],
})
export class DashboardModule {}
