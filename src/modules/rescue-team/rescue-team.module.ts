import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RescueTeamEntity } from '@infrastructure/database/entities/rescue-team.entity';
import { RescueTeamMemberEntity } from '@infrastructure/database/entities/rescue-team-member.entity';
import { RescueTeamService } from './application/services/rescue-team.service';
import { RescueTeamController } from './presentation/controllers/rescue-team.controller';
import { RescueTeamRepositoryImpl } from './infrastructure/persistence/repositories/rescue-team.repository';
import {
  ProvinceRepositoryImpl,
  WardRepositoryImpl,
} from '../location/infrastructure/persistence/repositories/location.repository.impl';
import { ProvinceEntity } from '@infrastructure/database/entities/province.entity';
import { AdministrativeUnitEntity } from '@infrastructure/database/entities/administrative-unit.entity';
import { TeamSpecializationModule } from '../team-specialization/team-specialization.module';
import { LocationModule } from '../location/location.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RescueTeamEntity,
      RescueTeamMemberEntity,
      ProvinceEntity,
      AdministrativeUnitEntity,
    ]),
    TeamSpecializationModule,
    LocationModule,
  ],
  controllers: [RescueTeamController],
  providers: [
    RescueTeamService,
    {
      provide: 'IRescueTeamRepository',
      useClass: RescueTeamRepositoryImpl,
    },
    {
      provide: 'IProvinceRepository',
      useClass: ProvinceRepositoryImpl,
    },
    {
      provide: 'IWardRepository',
      useClass: WardRepositoryImpl,
    },
  ],
  exports: [RescueTeamService, 'IRescueTeamRepository'],
})
export class RescueTeamModule {}
