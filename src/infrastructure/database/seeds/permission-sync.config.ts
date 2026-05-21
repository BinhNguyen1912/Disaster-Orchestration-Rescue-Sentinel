/**
 * Permission Sync Configuration
 *
 * File này chỉ RE-EXPORT từ permissions.constant.ts.
 * Toàn bộ khai báo nằm ở ROLE_PERMISSION_MATRIX trong permissions.constant.ts.
 *
 * Sync script đọc matrix → tự động generate permissions + role-permission mappings.
 *
 * Khi thêm module mới:
 *   1. Thêm enum vào PermModule (permissions.constant.ts)
 *   2. Thêm description vào MODULE_DESCRIPTIONS
 *   3. Thêm module vào từng role trong ROLE_PERMISSION_MATRIX
 *   4. Chạy: npm run sync:permissions
 *
 * KHÔNG cần sửa file này.
 */

export {
  ROLE_PERMISSION_MATRIX,
  PermModule,
  PermAction,
  MODULE_DESCRIPTIONS,
  ACTION_DESCRIPTIONS,
  buildPermission,
} from '@common/constants/permissions.constant';

export interface PermissionEntry {
  name: string;
  module: string;
  description: string;
  allowedRoleIds: number[];
}

/**
 * Biến đổi ROLE_PERMISSION_MATRIX thành flat list permissions.
 * Mỗi permission = 1 module:action, kèm danh sách roleIds được phép.
 */
export function flattenPermissions(
  ROLE_PERMISSION_MATRIX: Record<number, Record<string, readonly string[]>>,
  MODULE_DESCRIPTIONS: Record<string, string>,
  ACTION_DESCRIPTIONS: Record<string, string>,
  buildPermission: (module: string, action: string) => string,
): PermissionEntry[] {
  // Map: permissionName → { module, description, roleIds }
  const permMap = new Map<
    string,
    { module: string; description: string; roleIds: number[] }
  >();

  for (const [roleIdStr, moduleConfig] of Object.entries(
    ROLE_PERMISSION_MATRIX,
  )) {
    const roleId = parseInt(roleIdStr, 10);
    for (const [module, actions] of Object.entries(moduleConfig)) {
      for (const action of actions) {
        const permName = buildPermission(module, action);
        if (!permMap.has(permName)) {
          const moduleDesc = MODULE_DESCRIPTIONS[module] || module;
          const actionDesc = ACTION_DESCRIPTIONS[action] || action;
          permMap.set(permName, {
            module,
            description: `${actionDesc} ${moduleDesc}`,
            roleIds: [],
          });
        }
        permMap.get(permName)!.roleIds.push(roleId);
      }
    }
  }

  return Array.from(permMap.entries()).map(([name, data]) => ({
    name,
    module: data.module,
    description: data.description,
    allowedRoleIds: data.roleIds,
  }));
}
