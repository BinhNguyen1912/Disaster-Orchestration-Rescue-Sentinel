import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SosRequestEntity } from '@infrastructure/database/entities/sos-request.entity';
import { DispatchQueueEntity } from '@infrastructure/database/entities/dispatch-queue.entity';
import { AuditLogEntity } from '@infrastructure/database/entities/audit-log.entity';
import { SosStatusHistoryEntity } from '@infrastructure/database/entities/sos-status-history.entity';
import { SosRequestController } from './presentation/controllers/sos-request.controller';
import { SosRequestRepositoryImpl } from './infrastructure/persistence/repositories/sos-request.repository.impl';
import { DispatchQueueRepositoryImpl } from './infrastructure/persistence/repositories/dispatch-queue.repository.impl';
import { DistanceBasedDispatchStrategy } from './application/services/distance-based-dispatch.strategy';
import { DispatchOrchestratorService } from './application/services/dispatch-orchestrator.service';
import { DispatchConfigValidatorService } from './application/services/dispatch-config-validator.service';
import { RescueTeamModule } from '../rescue-team/rescue-team.module';
import { SystemSettingModule } from '../system-setting/system-setting.module';
import { LocationModule } from '../location/location.module';
import { SosRequestService } from './application/services/sos-request.service';
import { SosHistoryService } from './application/services/sos-history.service';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SosRequestEntity,
      DispatchQueueEntity,
      AuditLogEntity,
      SosStatusHistoryEntity,
    ]),
    RescueTeamModule,
    SystemSettingModule,
    LocationModule,
    WebSocketModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '15m') as any,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [SosRequestController],
  providers: [
    SosRequestService,
    SosHistoryService,
    DispatchOrchestratorService,
    DispatchConfigValidatorService,
    {
      provide: 'ISosRequestRepository',
      useClass: SosRequestRepositoryImpl,
    },
    {
      provide: 'IDispatchQueueRepository',
      useClass: DispatchQueueRepositoryImpl,
    },
    {
      provide: 'IDispatchStrategy',
      useClass: DistanceBasedDispatchStrategy,
    },
  ],
  exports: [
    SosRequestService,
    DispatchOrchestratorService,
    'ISosRequestRepository',
    'IDispatchQueueRepository',
  ],
})
export class SosRequestModule {}
