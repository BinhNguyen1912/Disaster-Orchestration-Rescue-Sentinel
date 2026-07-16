import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import type { IUserService } from '../interfaces/user.service.interface';
import type { UpdateUserDto } from '../dtos/update-user.dto';
import type { QueryUserDto } from '../dtos/query-user.dto';
import type { ChangePasswordDto } from '../dtos/change-password.dto';
import type { BulkUpdateUserDto } from '../dtos/bulk-update-user.dto';
import {
  PaginationParams,
  PaginatedResult,
} from '@shared/common/dtos/pagination.dto';
import type { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { User } from '../../domain/entities/user.entity';
import { APP_MESSAGES } from '@shared/index';
import * as bcrypt from 'bcrypt';
import { NotificationSocketService } from '../../../websocket/services/notification-socket.service';

@Injectable()
export class UserService implements IUserService {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepo: IUserRepository,
    private readonly notificationSocketService: NotificationSocketService,
  ) {}


  async findAll(
    filters: QueryUserDto,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<User>> {
    return this.userRepo.findAll(filters, {
      page: pagination.page || 1,
      limit: pagination.limit || 20,
    });
  }

  async findById(id: number): Promise<User> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new NotFoundException(APP_MESSAGES.USER.USER_NOT_FOUND);
    }
    return user;
  }

  async getProfile(userId: number): Promise<User> {
    return this.findById(userId);
  }

  async updateProfile(userId: number, dto: UpdateUserDto): Promise<User> {
    const updateData: any = { ...dto };
    if (dto.dateOfBirth) {
      updateData.dateOfBirth = new Date(dto.dateOfBirth);
    }
    const user = await this.userRepo.update(userId, updateData);
    if (!user) {
      throw new NotFoundException(APP_MESSAGES.USER.USER_NOT_FOUND);
    }
    return user;
  }

  async update(id: number, dto: UpdateUserDto): Promise<User> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new NotFoundException(APP_MESSAGES.USER.USER_NOT_FOUND);
    }

    if (dto.phone && dto.phone !== user.phone) {
      const existing = await this.userRepo.findByPhone(dto.phone);
      if (existing && existing.id !== id) {
        throw new ConflictException(APP_MESSAGES.USER.PHONE_ALREADY_EXISTS);
      }
    }

    if (dto.email && dto.email !== user.email) {
      const existing = await this.userRepo.findByEmail(dto.email);
      if (existing && existing.id !== id) {
        throw new ConflictException(APP_MESSAGES.USER.EMAIL_ALREADY_EXISTS);
      }
    }

    const updateData: any = { ...dto };
    if (dto.dateOfBirth) {
      updateData.dateOfBirth = new Date(dto.dateOfBirth);
    }

    const updated = await this.userRepo.update(id, updateData);
    return updated!;
  }

  async delete(id: number): Promise<void> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new NotFoundException(APP_MESSAGES.USER.USER_NOT_FOUND);
    }
    await this.userRepo.softDelete(id);
  }

  async updateStatus(id: number, isActive: boolean): Promise<User> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new NotFoundException(APP_MESSAGES.USER.USER_NOT_FOUND);
    }
    const updated = await this.userRepo.update(id, { isActive });
    return updated!;
  }

  async changePassword(id: number, dto: ChangePasswordDto): Promise<void> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new NotFoundException(APP_MESSAGES.USER.USER_NOT_FOUND);
    }

    if (dto.currentPassword && user.password) {
      const isValid = await bcrypt.compare(dto.currentPassword, user.password);
      if (!isValid) {
        throw new BadRequestException('Current password is incorrect');
      }
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepo.update(id, { password: hashedPassword });
  }

  async search(query: string): Promise<User[]> {
    return this.userRepo.search(query);
  }

  async bulkUpdate(dto: BulkUpdateUserDto): Promise<{ updated: number }> {
    const { ids, roleId, isActive } = dto;
    return this.userRepo.bulkUpdate(ids, { roleId, isActive });
  }

  async getStats(provinceId?: number): Promise<{
    total: number;
    verified: number;
    unverified: number;
    volunteers: number;
    needsHelp: number;
  }> {
    const userRoleId = await this.userRepo.findRoleIdByName('RESIDENT') || 9;
    const filter: any = { roleId: userRoleId }; // Strictly filter by Resident role
    if (provinceId) {
      filter.provinceId = provinceId;
    }

    const [total, verified, unverified, volunteers, needsHelp] = await Promise.all([
      this.userRepo.count(filter),
      this.userRepo.count({ ...filter, isVerified: true }),
      this.userRepo.count({ ...filter, isVerified: false }),
      this.userRepo.count({ ...filter, isVolunteer: true }),
      this.userRepo.count({ ...filter, needsHelp: true }),
    ]);

    return { total, verified, unverified, volunteers, needsHelp };
  }

  async sendNotification(
    id: number,
    payload: { title: string; body: string; type: string; senderId?: number },
  ): Promise<void> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new NotFoundException(APP_MESSAGES.USER.USER_NOT_FOUND);
    }
    await this.notificationSocketService.pushToUser(id, payload);
  }
}

