import { SetMetadata } from '@nestjs/common';
import type { PermissionString } from '@common/constants/permissions.constant';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator gán metadata quyền yêu cầu lên endpoint.
 * PermissionGuard sẽ đọc metadata này để kiểm tra user có quyền tương ứng không.
 *
 * Cách dùng:
 *   @RequirePermissions(Permissions.SOS_CREATE, Permissions.SOS_READ)
 *   @Post('sos')
 *   async createSos() { ... }
 *
 * Quy ước tên permission: {module}:{action}
 * Action phải thuộc PermissionAction enum — xem permissions.constant.ts
 * Dùng Permissions constant object — không gõ raw string.
 */
export const RequirePermissions = (...permissions: PermissionString[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
