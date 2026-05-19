import { Province } from './province';
import { User } from './user';
import { RolePermission } from './role-permission';
import { UserRole } from './user-role';

export class Role {
  id: number;
  provinceId?: number;
  name: string;
  description?: string;
  level: number;
  isSystem: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: number;
  province?: Province | null;
  creator?: User | null;
  rolePermissions: RolePermission[];
  userRoles: UserRole[];
}
