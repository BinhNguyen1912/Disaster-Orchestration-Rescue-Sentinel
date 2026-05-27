import { IBaseRepository } from './base.repository.interface';
import { PermissionEntity } from '@infrastructure/database/entities/permission.entity';

export interface IPermissionRepository extends IBaseRepository<PermissionEntity> {
  findPermissionNamesByRoleId(roleId: number): Promise<string[]>;
}
