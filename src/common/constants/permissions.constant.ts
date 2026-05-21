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
 *
 * Tương đương RESTful:
 *   CREATE ↔ POST     → tạo mới resource
 *   READ   ↔ GET      → đọc/xem resource
 *   UPDATE ↔ PUT/PATCH → cập nhật resource
 *   DELETE ↔ DELETE   → xóa resource
 *   MANAGE ↔ Admin    → Full CRUD (gộp create+update+delete, cho admin)
 *   VERIFY ↔ Domain   → xác minh (flood:verify, report:verify)
 */
export enum PermAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage',
  VERIFY = 'verify',
}

/**
 * HTTP Method → PermAction mapping.
 * Dùng trong DiscoveryService validator để kiểm tra
 * controller method có đúng action không.
 *
 * @example
 *   HTTP_METHOD_ACTION.POST → PermAction.CREATE
 *   HTTP_METHOD_ACTION.GET  → PermAction.READ
 */
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

/**
 * Các bộ action thường dùng, khai báo 1 lần thay vì liệt kê lại.
 *
 * ALL         → mọi action (dành SYSTEM_ADMIN)
 * CRUD        → create + read + update + delete
 * MANAGE_READ → manage + read (admin quản lý module)
 * CREATE_READ → create + read (user cơ bản)
 * READ_ONLY   → chỉ read
 * CRUD_VERIFY → create + read + update + delete + verify
 */
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

// Type: giá trị của ActionSet (mảng PermAction)
export type ActionSetValue = PermAction[];

// ──────────────────────────────────────────
// 4. ROLE PERMISSION MATRIX — Khai báo duy nhất 1 chỗ
// ──────────────────────────────────────────

/**
 * System Role IDs — tương ứng bảng `role` trong DB.
 * Dùng trong ROLE_PERMISSION_MATRIX làm key.
 */
export const SystemRoleId = {
  SYSTEM_ADMIN: 1,
  PROVINCE_ADMIN: 2,
  RESCUE_TEAM_LEADER: 3,
  USER: 4,
} as const;

/**
 * Mô tả module cho hiển thị (description trong DB).
 * Thêm module mới → thêm vào đây.
 */
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

/**
 * Mô tả action cho hiển thị (description trong DB).
 */
export const ACTION_DESCRIPTIONS: Record<PermAction, string> = {
  [PermAction.CREATE]: 'Tạo mới',
  [PermAction.READ]: 'Xem',
  [PermAction.UPDATE]: 'Cập nhật',
  [PermAction.DELETE]: 'Xóa',
  [PermAction.MANAGE]: 'Quản lý',
  [PermAction.VERIFY]: 'Xác minh',
};

/**
 * ROLE PERMISSION MATRIX — Khai báo trung tâm.
 *
 * Cách đọc: Role X → Module Y → Actions Z
 * Nếu role KHÔNG có module → role đó KHÔNG có bất kỳ permission nào của module đó.
 *
 * @example
 *   // SYSTEM_ADMIN (roleId=1) có TẤT CẢ action cho TẤT CẢ module
 *   [SystemRoleId.SYSTEM_ADMIN]: { [PermModule.SOS]: ActionSet.ALL, ... }
 *
 *   // USER (roleId=4) chỉ được tạo+ xem SOS, xem rescue, tạo+xem flood, xem disaster+donation+alert+message
 *   [SystemRoleId.USER]: { [PermModule.SOS]: ActionSet.CREATE_READ, ... }
 *
 * Khi thêm module mới:
 *   1. Thêm enum vào PermModule
 *   2. Thêm description vào MODULE_DESCRIPTIONS
 *   3. Thêm module vào từng role trong matrix
 *   4. Chạy npm run sync:permissions
 */
export const ROLE_PERMISSION_MATRIX: Record<
  number,
  Record<PermModule, readonly PermAction[]>
> = {
  // ──── SYSTEM_ADMIN (roleId=1): Tất cả modules, tất cả actions ────
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

  // ──── PROVINCE_ADMIN (roleId=2): Manage+Read hầu hết, Verify flood ────
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

  // ──── RESCUE_TEAM_LEADER (roleId=3): Quản lý cứu hộ, tạo+xem SOS/flood ────
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

  // ──── USER (roleId=4): Tạo+xem SOS/flood, chỉ xem các module khác, KHÔNG có user:manage, report:read ────
  [SystemRoleId.USER]: {
    [PermModule.SOS]: ActionSet.CREATE_READ,
    [PermModule.RESCUE]: ActionSet.READ_ONLY,
    [PermModule.FLOOD]: ActionSet.CREATE_READ,
    [PermModule.DISASTER]: ActionSet.READ_ONLY,
    [PermModule.DONATION]: ActionSet.READ_ONLY,
    [PermModule.MESSAGE]: ActionSet.READ_ONLY,
    [PermModule.ALERT]: ActionSet.READ_ONLY,
    [PermModule.USER]: [], // USER không có quyền user nào
    [PermModule.REPORT]: [], // USER không có quyền report nào
  },
};

// ──────────────────────────────────────────
// 5. HELPER — Build permission string
// ──────────────────────────────────────────

/**
 * Tạo permission string chuẩn từ module + action.
 * @example buildPermission(PermModule.SOS, PermAction.CREATE) → 'sos:create'
 */
export function buildPermission(
  module: PermModule,
  action: PermAction,
): string {
  return `${module}:${action}`;
}

// ──────────────────────────────────────────
// 6. AUTO-GENERATE Permissions const từ MATRIX
// ──────────────────────────────────────────

/**
 * Tự động generate Permissions object từ ROLE_PERMISSION_MATRIX.
 * Không cần khai báo thủ công nữa — chỉ cần sửa matrix.
 *
 * Kết quả: { SOS_CREATE: 'sos:create', SOS_READ: 'sos:read', ... }
 */
function generatePermissions(): Record<string, string> {
  const perms: Record<string, string> = {};

  // Duyệt qua tất cả role → module → action để tìm mọi permission có
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

  // Tạo permission constant cho mỗi module:action
  for (const module of allModules) {
    const actions = moduleActions.get(module) || new Set();
    for (const action of actions) {
      const key = `${module.toUpperCase()}_${action.toUpperCase()}`;
      perms[key] = buildPermission(module, action);
    }
  }

  return perms;
}

/**
 * Tất cả permission trong hệ thống — AUTO-GENERATED từ matrix.
 * Dùng trong decorator:
 *   @RequirePermissions(Permissions.SOS_CREATE)
 *   @RequirePermissions(Permissions.USER_MANAGE, Permissions.USER_READ)
 */
export const Permissions: Readonly<Record<string, string>> =
  generatePermissions();

/**
 * Type: tất cả giá trị permission string.
 * Dùng cho type-safe decorator parameter.
 *
 * @example
 *   @RequirePermissions(Permissions.SOS_CREATE)  // ✅
 *   @RequirePermissions('sos:get')               // ❌ Compile error
 */
export type PermissionString = (typeof Permissions)[keyof typeof Permissions];
