import { IBaseRepository } from './base.repository.interface';
import { Permission } from '@domain/entities/permission';

export interface IPermissionRepository extends IBaseRepository<Permission> {
  /**
   * Lấy danh sách tên permission của một role.
   * Dùng bởi PermissionGuard để kiểm tra user có quyền yêu cầu không.
   *
   * Query: SELECT p.name FROM permission p
   *        JOIN role_permission rp ON p.id = rp.permissionId
   *        WHERE rp.roleId = :roleId
   */
  findPermissionNamesByRoleId(roleId: number): Promise<string[]>;
}
