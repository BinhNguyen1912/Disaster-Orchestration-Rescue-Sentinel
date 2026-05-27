import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RescueTeamService } from './application/services/rescue-team.service';
import { TeamSpecializationService } from './application/services/team-specialization.service';
import { RescueTeamController } from './presentation/controllers/rescue-team.controller';
import { TeamSpecializationController } from './presentation/controllers/team-specialization.controller';

import { RescueTeamRepositoryImpl } from './infrastructure/persistence/repositories/rescue-team.repository';
import { RescueTeamMemberRepositoryImpl } from './infrastructure/persistence/repositories/rescue-team-member.repository';
import { TeamSpecializationRepositoryImpl } from './infrastructure/persistence/repositories/team-specialization.repository';

import { RescueTeamEntity } from '@infrastructure/database/entities/rescue-team.entity';
import { RescueTeamMemberEntity } from '@infrastructure/database/entities/rescue-team-member.entity';
import { TeamSpecializationEntity } from '@infrastructure/database/entities/team-specialization.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RescueTeamEntity,
      RescueTeamMemberEntity,
      TeamSpecializationEntity,
    ]),
  ],
  controllers: [RescueTeamController, TeamSpecializationController],
  providers: [
    RescueTeamService,
    TeamSpecializationService,
    {
      provide: 'IRescueTeamRepository',
      useClass: RescueTeamRepositoryImpl,
    },
    {
      provide: 'IRescueTeamMemberRepository',
      useClass: RescueTeamMemberRepositoryImpl,
    },
    {
      provide: 'ITeamSpecializationRepository',
      useClass: TeamSpecializationRepositoryImpl,
    },
  ],
  exports: [RescueTeamService, TeamSpecializationService],
})
export class RescueTeamModule {}
