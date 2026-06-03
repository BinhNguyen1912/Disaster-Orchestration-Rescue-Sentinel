import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PermissionEntity } from '../entities/permission.entity';
import { RolePermissionEntity } from '../entities/role-permission.entity';
import { RoleEntity } from '../entities/role.entity';
import {
  Permissions,
  PermModule,
  PermAction,
  MODULE_DESCRIPTIONS,
  ACTION_DESCRIPTIONS,
  buildPermission,
  ROLE_PERMISSION_MATRIX,
} from '@shared/common/constants/permissions.constant';

@Injectable()
export class PermissionSeederService {
  private readonly logger = new Logger(PermissionSeederService.name);

  constructor(
    @InjectRepository(PermissionEntity)
    private readonly permissionRepo: Repository<PermissionEntity>,
    @InjectRepository(RolePermissionEntity)
    private readonly rolePermissionRepo: Repository<RolePermissionEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepo: Repository<RoleEntity>,
  ) {}

  async seedPermissions() {
    this.logger.log('Starting permission seeding...');

    // 1. Create all permissions in DB
    for (const [permKey, permName] of Object.entries(Permissions)) {
      await this.upsertPermission(permName);
    }

    // 2. Map roleId → permission records
    const permissionRecords = await this.permissionRepo.find();
    const permNameToId = new Map<string, number>();
    for (const perm of permissionRecords) {
      permNameToId.set(perm.name, perm.id);
    }

    // 3. Sync role-permission mappings
    for (const [roleIdStr, moduleConfig] of Object.entries(
      ROLE_PERMISSION_MATRIX,
    )) {
      const roleId = parseInt(roleIdStr, 10);
      const role = await this.roleRepo.findOne({ where: { id: roleId } });
      if (!role) {
        this.logger.warn(`Role ID ${roleId} not found, skipping...`);
        continue;
      }

      for (const [module, actions] of Object.entries(moduleConfig)) {
        for (const action of actions as readonly string[]) {
          const permName = buildPermission(
            module as PermModule,
            action as PermAction,
          );
          const permissionId = permNameToId.get(permName);
          if (!permissionId) {
            this.logger.warn(`Permission ${permName} not found in DB`);
            continue;
          }

          await this.upsertRolePermission(roleId, permissionId);
        }
      }
    }

    this.logger.log('Permission seeding completed successfully.');
  }

  private async upsertPermission(name: string): Promise<PermissionEntity> {
    const module = name.split(':')[0];
    // Get description from constants if available

    let perm = await this.permissionRepo.findOne({ where: { name } });
    if (!perm) {
      perm = this.permissionRepo.create({
        name,
        module,
        description: name,
        isSystem: true,
      });
      perm = await this.permissionRepo.save(perm);
      this.logger.debug(`Created permission: ${name}`);
    }
    return perm;
  }

  private async upsertRolePermission(
    roleId: number,
    permissionId: number,
  ): Promise<void> {
    const existing = await this.rolePermissionRepo.findOne({
      where: { roleId, permissionId },
    });
    if (!existing) {
      await this.rolePermissionRepo.save(
        this.rolePermissionRepo.create({
          roleId,
          permissionId,
        }),
      );
    }
  }
}
