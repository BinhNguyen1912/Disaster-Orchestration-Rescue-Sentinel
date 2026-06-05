import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RescueTeamMemberEntity } from '@infrastructure/database/entities/rescue-team-member.entity';
import { RescueTeamMemberService } from './application/services/rescue-team-member.service';
import { RescueTeamMemberRepositoryImpl } from './infrastructure/persistence/repositories/rescue-team-member.repository';
import {
  RescueTeamMemberController,
  TeamLeaveController,
} from './presentation/controllers/rescue-team-member.controller';
import { RescueTeamModule } from '../rescue-team/rescue-team.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RescueTeamMemberEntity]),
    RescueTeamModule, // To access IRescueTeamRepository
  ],
  controllers: [RescueTeamMemberController, TeamLeaveController],
  providers: [
    RescueTeamMemberService,
    {
      provide: 'IRescueTeamMemberRepository',
      useClass: RescueTeamMemberRepositoryImpl,
    },
  ],
  exports: [RescueTeamMemberService, 'IRescueTeamMemberRepository'],
})
export class RescueTeamMemberModule {}
