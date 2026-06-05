import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamSpecializationEntity } from '@infrastructure/database/entities/team-specialization.entity';
import { TeamSpecializationService } from './application/services/team-specialization.service';
import { TeamSpecializationController } from './presentation/controllers/team-specialization.controller';
import { TeamSpecializationRepositoryImpl } from './infrastructure/persistence/repositories/team-specialization.repository';

@Module({
  imports: [TypeOrmModule.forFeature([TeamSpecializationEntity])],
  controllers: [TeamSpecializationController],
  providers: [
    TeamSpecializationService,
    {
      provide: 'ITeamSpecializationRepository',
      useClass: TeamSpecializationRepositoryImpl,
    },
  ],
  exports: [TeamSpecializationService, 'ITeamSpecializationRepository'],
})
export class TeamSpecializationModule {}
