import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FloodRequestEntity } from '@infrastructure/database/entities/flood-request.entity';
import { FloodRequestStatusHistoryEntity } from '@infrastructure/database/entities/flood-request-status-history.entity';
import { AuditLogEntity } from '@infrastructure/database/entities/audit-log.entity';
import { SosRequestEntity } from '@infrastructure/database/entities/sos-request.entity';
import { SosStatusHistoryEntity } from '@infrastructure/database/entities/sos-status-history.entity';
import { FloodRequestController } from './presentation/controllers/flood-request.controller';
import { FloodRequestService } from './application/services/flood-request.service';
import { FloodRequestRepositoryImpl } from './infrastructure/persistence/repositories/flood-request.repository.impl';
import { LocationModule } from '../location/location.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { SosRequestModule } from '../sos-request/sos-request.module';
import { RedisModule } from '../../infrastructure/redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FloodRequestEntity,
      FloodRequestStatusHistoryEntity,
      AuditLogEntity,
      SosRequestEntity,
      SosStatusHistoryEntity,
    ]),
    LocationModule,
    WebSocketModule,
    SosRequestModule,
    RedisModule,
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
  controllers: [FloodRequestController],
  providers: [
    FloodRequestService,
    {
      provide: 'IFloodRequestRepository',
      useClass: FloodRequestRepositoryImpl,
    },
  ],
  exports: [FloodRequestService, 'IFloodRequestRepository'],
})
export class FloodRequestModule {}
