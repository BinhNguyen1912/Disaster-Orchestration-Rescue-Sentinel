import { IBaseRepository } from './base.repository.interface';
import { Permission } from '../entities/permission';

export interface IPermissionRepository extends IBaseRepository<Permission> {
  findPermissionNamesByRoleId(roleId: number): Promise<string[]>;
}
