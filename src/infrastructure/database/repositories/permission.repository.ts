import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '@domain/entities/permission';
import { IPermissionRepository } from '@domain/repositories/permission.repository.interface';
import { PermissionEntity } from '../entities/permission.entity';
import { RolePermissionEntity } from '../entities/role-permission.entity';
import { BaseRepository } from './base.repository';

@Injectable()
export class PermissionRepositoryImpl
  extends BaseRepository<Permission, PermissionEntity>
  implements IPermissionRepository
{
  constructor(
    @InjectRepository(PermissionEntity)
    private readonly permissionRepository: Repository<PermissionEntity>,
    @InjectRepository(RolePermissionEntity)
    private readonly rolePermissionRepository: Repository<RolePermissionEntity>,
  ) {
    super(permissionRepository);
  }

  protected toDomain(ormEntity: PermissionEntity): Permission {
    const permission = new Permission();
    Object.assign(permission, ormEntity);
    return permission;
  }

  protected toOrmEntity(
    domainEntity: Partial<Permission>,
  ): Partial<PermissionEntity> {
    const ormEntity = new PermissionEntity();
    Object.assign(ormEntity, domainEntity);
    return ormEntity;
  }

  /**
   * Lấy danh sách tên permission của một role.
   * PermissionGuard dùng method này để kiểm tra quyền.
   *
   * Query: SELECT p.name FROM permission p
   *        JOIN role_permission rp ON p.id = rp.permissionId
   *        WHERE rp.roleId = :roleId
   */
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
