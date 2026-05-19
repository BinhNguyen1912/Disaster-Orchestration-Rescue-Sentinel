import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { LoggerMiddleware } from './common/middlewares/logger.middleware';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './presentation/controllers/app.controller';
import { AppService } from './application/services/app.service';
import { DatabaseModule } from './infrastructure/database/database.module';
import { AuthModule } from './infrastructure/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
