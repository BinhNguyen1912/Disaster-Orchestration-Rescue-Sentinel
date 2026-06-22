import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SosRequestEntity } from '@infrastructure/database/entities/sos-request.entity';
import { SosRequestController } from './presentation/controllers/sos-request.controller';
import { SosRequestRepositoryImpl } from './infrastructure/persistence/repositories/sos-request.repository.impl';
import { DistanceBasedDispatchStrategy } from './application/services/distance-based-dispatch.strategy';
import { RescueTeamModule } from '../rescue-team/rescue-team.module';
import { SystemSettingModule } from '../system-setting/system-setting.module';
import { SosRequestService } from './application/services/sos-request.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SosRequestEntity]),
    RescueTeamModule,
    SystemSettingModule,
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
    {
      provide: 'ISosRequestRepository',
      useClass: SosRequestRepositoryImpl,
    },
    {
      provide: 'IDispatchStrategy',
      useClass: DistanceBasedDispatchStrategy,
    },
  ],
  exports: [SosRequestService, 'ISosRequestRepository'],
})
export class SosRequestModule {}
