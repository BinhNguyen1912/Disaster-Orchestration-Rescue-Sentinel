import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleEntity } from '@infrastructure/database/entities/role.entity';
import { RoleService } from './application/services/role.service';
import { RoleController } from './presentation/controllers/role.controller';
import { RoleRepositoryImpl } from './infrastructure/persistence/repositories/role.repository';

@Module({
  imports: [TypeOrmModule.forFeature([RoleEntity])],
  controllers: [RoleController],
  providers: [
    RoleService,
    {
      provide: 'IRoleRepository',
      useClass: RoleRepositoryImpl,
    },
  ],
  exports: [RoleService],
})
export class RoleModule {}
