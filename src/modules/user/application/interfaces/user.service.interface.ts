import {
  PaginatedResult,
  PaginationParams,
} from '../../../../shared/common/dtos/pagination.dto';
import { User } from '../../domain/entities/user.entity';
import type { UpdateUserDto } from '../dtos/update-user.dto';
import type { QueryUserDto } from '../dtos/query-user.dto';
import type { ChangePasswordDto } from '../dtos/change-password.dto';
import type { BulkUpdateUserDto } from '../dtos/bulk-update-user.dto';

export interface IUserService {
  findAll(
    filters: QueryUserDto,
    pagination: PaginationParams,
  ): Promise<
    PaginatedResult<
      Omit<
        User,
        | 'password'
        | 'passwordResetOtp'
        | 'passwordResetOtpExpires'
        | 'passwordResetToken'
      >
    >
  >;
  findById(id: number): Promise<User>;
  getProfile(userId: number): Promise<User>;
  updateProfile(userId: number, dto: UpdateUserDto): Promise<User>;
  update(id: number, dto: UpdateUserDto): Promise<User>;
  delete(id: number): Promise<void>;
  updateStatus(id: number, isActive: boolean): Promise<User>;
  changePassword(id: number, dto: ChangePasswordDto): Promise<void>;
  search(query: string): Promise<User[]>;
  bulkUpdate(dto: BulkUpdateUserDto): Promise<{ updated: number }>;
  getStats(provinceId?: number): Promise<{
    total: number;
    verified: number;
    unverified: number;
    volunteers: number;
    needsHelp: number;
  }>;
  sendNotification(
    id: number,
    payload: { title: string; body: string; type: string; senderId?: number },
  ): Promise<void>;
}

