import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../../../../../shared/common/decorators/permissions.decorator';
import type { IPermissionRepository } from '../../../domain/repositories/permission.repository.interface';
import { Inject } from '@nestjs/common';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject('IPermissionRepository')
    private readonly permissionRepository: IPermissionRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.roleId) {
      console.log('PermissionGuard: user has no roleId, passing through');
      return true;
    }

    const userPermissions =
      await this.permissionRepository.findPermissionNamesByRoleId(user.roleId);
    console.log(
      `PermissionGuard: roleId = ${user.roleId}, userPermissions =`,
      userPermissions,
      `required =`,
      requiredPermissions,
    );

    const hasAllPermissions = requiredPermissions.every((perm) =>
      userPermissions.includes(perm),
    );

    if (!hasAllPermissions) {
      const missing = requiredPermissions.filter(
        (perm) => !userPermissions.includes(perm),
      );
      throw new ForbiddenException(
        `Missing required permissions: ${missing.join(', ')}`,
      );
    }

    return true;
  }
}
