import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RescueTeamRepositoryImpl } from '../database/repositories/rescue-team.repository';
import { RescueTeamMemberRepositoryImpl } from '../database/repositories/rescue-team-member.repository';
import { TeamSpecializationRepositoryImpl } from '../database/repositories/team-specialization.repository';
import { RescueTeamEntity } from '../database/entities/rescue-team.entity';
import { RescueTeamMemberEntity } from '../database/entities/rescue-team-member.entity';
import { TeamSpecializationEntity } from '../database/entities/team-specialization.entity';
import { RescueTeamService } from '../../application/services/rescue-team.service';
import { TeamSpecializationService } from '../../application/services/team-specialization.service';
import { RescueTeamController } from '../../presentation/controllers/rescue-team.controller';
import { TeamSpecializationController } from '../../presentation/controllers/team-specialization.controller';

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
    { provide: 'IRescueTeamRepository', useClass: RescueTeamRepositoryImpl },
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
