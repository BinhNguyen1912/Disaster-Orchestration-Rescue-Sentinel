import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from '../../application/services/auth.service';
import { AccessService } from '../../application/services/access.service';
import { AuthController } from '../../presentation/controllers/auth.controller';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PermissionGuard } from './guards/permission.guard';
import { UserEntity } from '@infrastructure/database/entities/user.entity';
import { RefreshTokenEntity } from '@infrastructure/database/entities/refresh-token.entity';
import { UserRoleEntity } from '@infrastructure/database/entities/user-role.entity';
import { PermissionEntity } from '@infrastructure/database/entities/permission.entity';
import { RolePermissionEntity } from '@infrastructure/database/entities/role-permission.entity';
import { UserRepositoryImpl } from '@infrastructure/database/repositories/user.repository';
import { RefreshTokenRepositoryImpl } from '@infrastructure/database/repositories/refresh-token.repository';
import { PermissionRepositoryImpl } from '@infrastructure/database/repositories/permission.repository';
import { MailModule } from '@infrastructure/mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      RefreshTokenEntity,
      UserRoleEntity,
      PermissionEntity,
      RolePermissionEntity,
    ]),
    PassportModule,
    MailModule,
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
    AccessService,
    LocalStrategy,
    JwtStrategy,
    PermissionGuard,
    {
      provide: 'IUserRepository',
      useClass: UserRepositoryImpl,
    },
    {
      provide: 'IRefreshTokenRepository',
      useClass: RefreshTokenRepositoryImpl,
    },
    {
      provide: 'IPermissionRepository',
      useClass: PermissionRepositoryImpl,
    },
  ],
  exports: [AuthService, AccessService, 'IPermissionRepository'],
})
export class AuthModule {}
