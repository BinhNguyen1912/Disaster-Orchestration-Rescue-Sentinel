import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IPermissionRepository } from '../../../domain/repositories/permission.repository.interface';
import { PermissionEntity } from '@infrastructure/database/entities/permission.entity';
import { RolePermissionEntity } from '@infrastructure/database/entities/role-permission.entity';

@Injectable()
export class PermissionRepositoryImpl implements IPermissionRepository {
  constructor(
    @InjectRepository(PermissionEntity)
    private readonly permissionRepository: Repository<PermissionEntity>,
    @InjectRepository(RolePermissionEntity)
    private readonly rolePermissionRepository: Repository<RolePermissionEntity>,
  ) {}

  async findById(id: number): Promise<PermissionEntity | null> {
    return this.permissionRepository.findOne({ where: { id } });
  }

  async findAll(): Promise<PermissionEntity[]> {
    return this.permissionRepository.find();
  }

  async findAndCount(): Promise<[PermissionEntity[], number]> {
    return this.permissionRepository.findAndCount();
  }

  async create(data: Partial<PermissionEntity>): Promise<PermissionEntity> {
    return this.permissionRepository.save(
      this.permissionRepository.create(data),
    );
  }

  async createMany(
    data: Partial<PermissionEntity>[],
  ): Promise<PermissionEntity[]> {
    return this.permissionRepository.save(
      this.permissionRepository.create(data),
    );
  }

  async update(
    id: number,
    data: Partial<PermissionEntity>,
  ): Promise<PermissionEntity | null> {
    const existing = await this.permissionRepository.findOne({ where: { id } });
    if (!existing) return null;
    return this.permissionRepository.save({ ...existing, ...data });
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.permissionRepository.delete(id);
    return result.affected ? result.affected > 0 : false;
  }

  async findPermissionNamesByRoleId(roleId: number): Promise<string[]> {
    const rolePermissions = await this.rolePermissionRepository.find({
      where: { roleId },
      relations: ['permission'],
    });

    return rolePermissions
      .map((rp) => rp.permission?.name)
      .filter((name): name is string => !!name);
  }
}
