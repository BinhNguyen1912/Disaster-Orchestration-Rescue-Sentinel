/**
 * Permission Constants — Single Source of Truth
 *
 * === KIẾN TRÚC 3 LAYER ===
 *
 * Layer 1: PermModule enum + PermAction enum → chuẩn hóa tên, không gõ sai
 * Layer 2: ROLE_PERMISSION_MATRIX → khai báo "role X được module Y với action Z"
 * Layer 3: Permissions const → auto-generate từ matrix, dùng trong @RequirePermissions()
 *
 * === TỪ KHÓA NÂNG CAO ===
 * - Enum as const: TypeScript hiểu từng giá trị hằng số
 * - Computed property names: auto-generate object keys từ enum
 * - Satisfies operator: đảm bảo object khớp kiểu mà không mở rộng
 * - DiscoveryService + MetadataScanner: scan decorator tại runtime
 */

// ──────────────────────────────────────────
// 1. MODULES — Tên module chuẩn hóa
// ──────────────────────────────────────────

/**
 * Enum tất cả module trong hệ thống.
 * Thêm module mới → thêm vào đây + vào ROLE_PERMISSION_MATRIX.
 */
export enum PermModule {
  SOS = 'sos',
  RESCUE = 'rescue',
  FLOOD = 'flood',
  DISASTER = 'disaster',
  DONATION = 'donation',
  USER = 'user',
  REPORT = 'report',
  ALERT = 'alert',
  MESSAGE = 'message',
}

// ──────────────────────────────────────────
// 2. ACTIONS — Tên action chuẩn hóa
// ──────────────────────────────────────────

/**
 * Enum chuẩn hóa các action trong hệ thống.
 * Mọi permission phải dùng 1 trong các action này.
 */
export enum PermAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage',
  VERIFY = 'verify',
}

export const HTTP_METHOD_ACTION = {
  POST: PermAction.CREATE,
  GET: PermAction.READ,
  PUT: PermAction.UPDATE,
  PATCH: PermAction.UPDATE,
  DELETE: PermAction.DELETE,
} as const;

// ──────────────────────────────────────────
// 3. ACTION SETS — Gom nhóm action hay dùng chung
// ──────────────────────────────────────────

export const ActionSet = {
  ALL: [
    PermAction.CREATE,
    PermAction.READ,
    PermAction.UPDATE,
    PermAction.DELETE,
    PermAction.MANAGE,
    PermAction.VERIFY,
  ],
  CRUD: [
    PermAction.CREATE,
    PermAction.READ,
    PermAction.UPDATE,
    PermAction.DELETE,
  ],
  MANAGE_READ: [PermAction.MANAGE, PermAction.READ],
  CREATE_READ: [PermAction.CREATE, PermAction.READ],
  READ_ONLY: [PermAction.READ],
  CRUD_VERIFY: [
    PermAction.CREATE,
    PermAction.READ,
    PermAction.UPDATE,
    PermAction.DELETE,
    PermAction.VERIFY,
  ],
  MANAGE_READ_VERIFY: [PermAction.MANAGE, PermAction.READ, PermAction.VERIFY],
} as const;

export type ActionSetValue = PermAction[];

// ──────────────────────────────────────────
// 4. ROLE PERMISSION MATRIX — Khai báo duy nhất 1 chỗ
// ──────────────────────────────────────────

export const SystemRoleId = {
  SYSTEM_ADMIN: 1,
  PROVINCE_ADMIN: 2,
  RESCUE_TEAM_LEADER: 3,
  USER: 4,
} as const;

export const MODULE_DESCRIPTIONS: Record<PermModule, string> = {
  [PermModule.SOS]: 'Yêu cầu cấp cứu',
  [PermModule.RESCUE]: 'Đội cứu hộ',
  [PermModule.FLOOD]: 'Báo cáo lũ',
  [PermModule.DISASTER]: 'Sự kiện thiên tai',
  [PermModule.DONATION]: 'Quyên góp',
  [PermModule.USER]: 'Người dùng',
  [PermModule.REPORT]: 'Báo cáo thống kê',
  [PermModule.ALERT]: 'Cảnh báo',
  [PermModule.MESSAGE]: 'Tin nhắn',
};

export const ACTION_DESCRIPTIONS: Record<PermAction, string> = {
  [PermAction.CREATE]: 'Tạo mới',
  [PermAction.READ]: 'Xem',
  [PermAction.UPDATE]: 'Cập nhật',
  [PermAction.DELETE]: 'Xóa',
  [PermAction.MANAGE]: 'Quản lý',
  [PermAction.VERIFY]: 'Xác minh',
};

export const ROLE_PERMISSION_MATRIX: Record<
  number,
  Record<PermModule, readonly PermAction[]>
> = {
  [SystemRoleId.SYSTEM_ADMIN]: {
    [PermModule.SOS]: ActionSet.ALL,
    [PermModule.RESCUE]: ActionSet.ALL,
    [PermModule.FLOOD]: ActionSet.ALL,
    [PermModule.DISASTER]: ActionSet.ALL,
    [PermModule.DONATION]: ActionSet.ALL,
    [PermModule.USER]: ActionSet.ALL,
    [PermModule.REPORT]: ActionSet.ALL,
    [PermModule.ALERT]: ActionSet.ALL,
    [PermModule.MESSAGE]: ActionSet.ALL,
  },
  [SystemRoleId.PROVINCE_ADMIN]: {
    [PermModule.SOS]: ActionSet.CRUD,
    [PermModule.RESCUE]: ActionSet.MANAGE_READ,
    [PermModule.FLOOD]: ActionSet.CRUD_VERIFY,
    [PermModule.DISASTER]: ActionSet.MANAGE_READ,
    [PermModule.DONATION]: ActionSet.MANAGE_READ,
    [PermModule.USER]: ActionSet.MANAGE_READ,
    [PermModule.REPORT]: ActionSet.READ_ONLY,
    [PermModule.ALERT]: ActionSet.MANAGE_READ,
    [PermModule.MESSAGE]: ActionSet.MANAGE_READ,
  },
  [SystemRoleId.RESCUE_TEAM_LEADER]: {
    [PermModule.SOS]: ActionSet.CRUD,
    [PermModule.RESCUE]: ActionSet.MANAGE_READ,
    [PermModule.FLOOD]: ActionSet.CREATE_READ,
    [PermModule.DISASTER]: ActionSet.READ_ONLY,
    [PermModule.DONATION]: ActionSet.READ_ONLY,
    [PermModule.USER]: ActionSet.READ_ONLY,
    [PermModule.REPORT]: ActionSet.READ_ONLY,
    [PermModule.ALERT]: ActionSet.READ_ONLY,
    [PermModule.MESSAGE]: ActionSet.MANAGE_READ,
  },
  [SystemRoleId.USER]: {
    [PermModule.SOS]: ActionSet.CREATE_READ,
    [PermModule.RESCUE]: ActionSet.READ_ONLY,
    [PermModule.FLOOD]: ActionSet.CREATE_READ,
    [PermModule.DISASTER]: ActionSet.READ_ONLY,
    [PermModule.DONATION]: ActionSet.READ_ONLY,
    [PermModule.MESSAGE]: ActionSet.READ_ONLY,
    [PermModule.ALERT]: ActionSet.READ_ONLY,
    [PermModule.USER]: [],
    [PermModule.REPORT]: [],
  },
};

// ──────────────────────────────────────────
// 5. HELPER — Build permission string
// ──────────────────────────────────────────

export function buildPermission(
  module: PermModule,
  action: PermAction,
): string {
  return `${module}:${action}`;
}

// ──────────────────────────────────────────
// 6. AUTO-GENERATE Permissions const từ MATRIX
// ──────────────────────────────────────────

function generatePermissions(): Record<string, string> {
  const perms: Record<string, string> = {};

  const allModules = new Set<PermModule>();
  const moduleActions = new Map<PermModule, Set<PermAction>>();

  for (const roleConfig of Object.values(ROLE_PERMISSION_MATRIX)) {
    for (const [module, actions] of Object.entries(roleConfig)) {
      const mod = module as PermModule;
      allModules.add(mod);
      if (!moduleActions.has(mod)) {
        moduleActions.set(mod, new Set());
      }
      for (const action of actions) {
        moduleActions.get(mod)!.add(action);
      }
    }
  }

  for (const module of allModules) {
    const actions = moduleActions.get(module) || new Set();
    for (const action of actions) {
      const key = `${module.toUpperCase()}_${action.toUpperCase()}`;
      perms[key] = buildPermission(module, action);
    }
  }

  return perms;
}

export const Permissions: Readonly<Record<string, string>> =
  generatePermissions();

export type PermissionString = (typeof Permissions)[keyof typeof Permissions];
