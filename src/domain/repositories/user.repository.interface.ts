import { User } from '../entities/user';
import { IBaseRepository } from './base.repository.interface';

export interface IUserRepository extends IBaseRepository<User> {
  findByIdentifier(identifier: string): Promise<User | null>;
  findByResetToken(resetToken: string): Promise<User | null>;
  assignRole(
    userId: number,
    roleId: number,
    provinceId: number,
    assignedBy?: number,
  ): Promise<void>;
}
