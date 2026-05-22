import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { LoggerMiddleware } from './common/middlewares/logger.middleware';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './presentation/controllers/app.controller';
import { AppService } from './application/services/app.service';
import { DatabaseModule } from './infrastructure/database/database.module';
import { AuthModule } from './infrastructure/auth/auth.module';
import { HealthModule } from './infrastructure/health/health.module';
import { RescueTeamModule } from './infrastructure/rescue-team/rescue-team.module';
import { APP_GUARD } from '@nestjs/core';
import { AccessGuard } from './infrastructure/auth/guards/access.guard';
import { PermissionGuard } from './infrastructure/auth/guards/permission.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    AuthModule,
    HealthModule,
    RescueTeamModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Guard Pipeline: AccessGuard chạy TRƯỚC (xác thực), PermissionGuard chạy SAU (phân quyền)
    {
      provide: APP_GUARD,
      useClass: AccessGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
