import { User } from './user';
import { RolePermission } from './role-permission';

export class Permission {
  id: number;
  name: string;
  module: string;
  description?: string;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: number;
  updatedBy?: number;
  creator?: User | null;
  updater?: User | null;
  rolePermissions: RolePermission[];
}
