import {
  Module,
  NestModule,
  MiddlewareConsumer,
  Controller,
  Get,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { LoggerMiddleware } from '@shared/common/middlewares/logger.middleware';
import { DatabaseModule } from '@infrastructure/database/database.module';
import { AuthModule } from '@modules/auth/auth.module';
import { HealthModule } from '@modules/health/health.module';
import { RescueTeamModule } from '@modules/rescue-team/rescue-team.module';
import { LocationModule } from '@modules/location/location.module';
import { RoleModule } from './modules/role/role.module';
import { AccessGuard } from '@modules/auth/infrastructure/auth/guards/access.guard';
import { PermissionGuard } from '@modules/auth/infrastructure/auth/guards/permission.guard';
import { Public } from '@modules/auth/infrastructure/auth/decorators/public.decorator';

@ApiTags('Root')
@Controller()
export class AppController {
  @Public()
  @Get()
  getHello(): string {
    return 'Rescue System API is running!';
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    AuthModule,
    HealthModule,
    RescueTeamModule,
    LocationModule,
    RoleModule,
  ],
  controllers: [AppController],
  providers: [
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
