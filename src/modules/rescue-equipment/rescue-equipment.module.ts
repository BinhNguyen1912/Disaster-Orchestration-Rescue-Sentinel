import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RescueEquipmentEntity } from '@infrastructure/database/entities/rescue-equipment.entity';
import { RescueEquipmentController } from './presentation/controllers/rescue-equipment.controller';
import { RescueEquipmentService } from './application/services/rescue-equipment.service';
import { RescueEquipmentRepositoryImpl } from './infrastructure/persistence/repositories/rescue-equipment.repository';
import { RescueTeamModule } from '../rescue-team/rescue-team.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RescueEquipmentEntity]),
    RescueTeamModule,
  ],
  controllers: [RescueEquipmentController],
  providers: [
    RescueEquipmentService,
    {
      provide: 'IRescueEquipmentRepository',
      useClass: RescueEquipmentRepositoryImpl,
    },
  ],
  exports: [RescueEquipmentService, 'IRescueEquipmentRepository'],
})
export class RescueEquipmentModule {}
