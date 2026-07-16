import { PaginatedResult } from '../../../../shared/common/dtos/pagination.dto';
import { User } from '../entities/user.entity';

export interface QueryUserParams {
  page?: number;
  limit?: number;
  provinceId?: number;
  adminUnitId?: number;
  isActive?: boolean;
  isVerified?: boolean;
  roleId?: number;
  search?: string;
  isVolunteer?: boolean;
  needsHelp?: boolean;
}


export interface IUserRepository {
  findById(id: number): Promise<User | null>;
  findByPhone(phone: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByNationalId(nationalId: string): Promise<User | null>;
  findAll(
    filters: QueryUserParams,
    pagination: { page: number; limit: number },
  ): Promise<PaginatedResult<Omit<User, 'password'>>>;
  create(data: Partial<User>): Promise<User>;
  update(
    id: number,
    data: Partial<User> & { roleId?: number },
  ): Promise<User | null>;
  softDelete(id: number): Promise<boolean>;
  count(conditions: any): Promise<number>;
  search(query: string): Promise<User[]>;
  bulkUpdate(
    ids: number[],
    data: { roleId?: number; isActive?: boolean },
  ): Promise<{ updated: number }>;
  findRoleIdByName(name: string): Promise<number | null>;
}
