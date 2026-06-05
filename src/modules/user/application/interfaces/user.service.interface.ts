import {
  PaginatedResult,
  PaginationParams,
} from '../../../../shared/common/dtos/pagination.dto';
import { User } from '../../domain/entities/user.entity';
import type { UpdateUserDto } from '../dtos/update-user.dto';
import type { QueryUserDto } from '../dtos/query-user.dto';
import type { ChangePasswordDto } from '../dtos/change-password.dto';

export interface IUserService {
  findAll(
    filters: QueryUserDto,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<User>>;
  findById(id: number): Promise<User>;
  getProfile(userId: number): Promise<User>;
  updateProfile(userId: number, dto: UpdateUserDto): Promise<User>;
  update(id: number, dto: UpdateUserDto): Promise<User>;
  delete(id: number): Promise<void>;
  updateStatus(id: number, isActive: boolean): Promise<User>;
  changePassword(id: number, dto: ChangePasswordDto): Promise<void>;
  search(query: string): Promise<User[]>;
}
