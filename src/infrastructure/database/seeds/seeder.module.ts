import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '../database.module';
import { SeederService } from './seeder.service';
import { ProvinceEntity } from '../entities/province.entity';
import { RoleEntity } from '../entities/role.entity';
import { UserEntity } from '../entities/user.entity';
import { UserRoleEntity } from '../entities/user-role.entity';
import { TeamSpecializationEntity } from '../entities/team-specialization.entity';
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
    ]),
  ],
  providers: [SeederService],
})
export class SeederModule {}
