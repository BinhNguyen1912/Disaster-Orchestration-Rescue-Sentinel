import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { IRoleRepository } from '../../domain/repositories/role.repository.interface';
import type { CreateRoleDto, UpdateRoleDto } from '../dtos/role.dto';
import type { Role } from '../../domain/entities/role.entity';
import { APP_MESSAGES } from '@shared/index';
import { IRoleService } from '../interfaces/role.interface';

@Injectable()
export class RoleService implements IRoleService {
  constructor(
    @Inject('IRoleRepository') private readonly roleRepo: IRoleRepository,
  ) {}

  async create(dto: CreateRoleDto): Promise<Role> {
    return this.roleRepo.create({
      ...dto,
      isSystem: dto.isSystem ?? false,
      isActive: dto.isActive ?? true,
    });
  }

  async findAll(
    filters: { isActive?: boolean; search?: string },
    pagination: { page: number; limit: number },
  ): Promise<{ items: Role[]; total: number }> {
    return this.roleRepo.findAll(filters, pagination);
  }

  async findById(id: number): Promise<Role> {
    const role = await this.roleRepo.findById(id);
    if (!role) {
      throw new NotFoundException(APP_MESSAGES.ROLE.ROLE_NOT_FOUND);
    }
    return role;
  }

  async update(id: number, dto: UpdateRoleDto): Promise<Role> {
    const role = await this.roleRepo.update(id, dto);
    if (!role) {
      throw new NotFoundException(APP_MESSAGES.ROLE.ROLE_NOT_FOUND);
    }
    return role;
  }

  async delete(id: number): Promise<void> {
    const role = await this.roleRepo.findById(id);
    if (!role) {
      throw new NotFoundException(APP_MESSAGES.ROLE.ROLE_NOT_FOUND);
    }
    if (role.isSystem) {
      throw new NotFoundException(APP_MESSAGES.ROLE.CANNOT_DELETE_SYSTEM_ROLE);
    }
    await this.roleRepo.delete(id);
  }
}
