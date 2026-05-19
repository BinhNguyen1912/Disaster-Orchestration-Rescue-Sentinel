import { User } from './user';
import { Role } from './role';
import { Province } from './province';

export class UserRole {
  id: number;
  userId: number;
  roleId: number;
  provinceId: number;
  assignedBy?: number;
  assignedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
  revokedAt?: Date;
  revokedBy?: number;
  user: User;
  role: Role;
  province: Province;
}
