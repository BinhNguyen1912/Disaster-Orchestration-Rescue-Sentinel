import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '../database.module';
import { SeederService } from './seeder.service';
import { PermissionSeederService } from './permission-seeder.service';
import { ProvinceEntity } from '../entities/province.entity';
import { RoleEntity } from '../entities/role.entity';
import { UserEntity } from '../entities/user.entity';
import { UserRoleEntity } from '../entities/user-role.entity';
import { TeamSpecializationEntity } from '../entities/team-specialization.entity';
import { PermissionEntity } from '../entities/permission.entity';
import { RolePermissionEntity } from '../entities/role-permission.entity';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    TypeOrmModule.forFeature([
      ProvinceEntity,
      RoleEntity,
      UserEntity,
      UserRoleEntity,
      TeamSpecializationEntity,
      PermissionEntity,
      RolePermissionEntity,
    ]),
  ],
  providers: [SeederService, PermissionSeederService],
})
export class SeederModule {}
