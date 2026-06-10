import { SetMetadata } from '@nestjs/common';
import type { PermissionString } from '@shared/common/constants/permissions.constant';

export const PERMISSIONS_KEY = 'permissions';

export const RequirePermissions = (...permissions: PermissionString[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
