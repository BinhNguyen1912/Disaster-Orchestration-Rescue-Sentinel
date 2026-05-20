import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from '../../application/services/auth.service';
import { AuthController } from '../../presentation/controllers/auth.controller';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UserEntity } from '@infrastructure/database/entities/user.entity';
import { RefreshTokenEntity } from '@infrastructure/database/entities/refresh-token.entity';
import { UserRepositoryImpl } from '@infrastructure/database/repositories/user.repository';
import { RefreshTokenRepositoryImpl } from '@infrastructure/database/repositories/refresh-token.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, RefreshTokenEntity]),
    PassportModule,
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
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    {
      provide: 'IUserRepository',
      useClass: UserRepositoryImpl,
    },
    {
      provide: 'IRefreshTokenRepository',
      useClass: RefreshTokenRepositoryImpl,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
