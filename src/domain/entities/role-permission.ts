import { Role } from './role';
import { Permission } from './permission';

export class RolePermission {
  roleId: number;
  permissionId: number;
  grantedBy?: number;
  grantedAt: Date;
  role: Role;
  permission: Permission;
}
