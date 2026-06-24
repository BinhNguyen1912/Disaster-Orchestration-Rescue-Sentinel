/**
 * Tất cả key dùng để truy vấn bảng `system_setting` cho module Auto-Dispatch.
 */
export const DISPATCH_KEYS = {
  /** Danh sách bán kính quét, phân cách bằng dấu phẩy (mét).
   * Mặc định: '5000,10000,20000,40000,50000' */
  RADIUS_STEPS: 'dispatch.radius_steps',

  /** JSON ma trận trọng số theo severity.
   * Ví dụ: { "CRITICAL": { "dist": 0.8, "cases": 0.1, "skill": 0.1 }, ... } */
  WEIGHT_MATRIX: 'dispatch.weight_matrix',

  /** Trọng số khoảng cách (fallback khi không có weight_matrix) */
  WEIGHT_DISTANCE: 'dispatch.weight_distance',

  /** Trọng số tải trọng (fallback khi không có weight_matrix) */
  WEIGHT_ACTIVE_CASES: 'dispatch.weight_active_cases',

  /** Trọng số lệch chuyên môn (fallback khi không có weight_matrix) */
  WEIGHT_SKILL_MISMATCH: 'dispatch.weight_skill_mismatch',

  /** JSON  loại mappingSOS → danh sách loại đội + mức lệch chuyên môn (0.0–1.0) */
  SKILL_MAPPING: 'dispatch.skill_mapping',

  /** Ngưỡng dừng sớm Pha 1 — score sơ bộ tốt nhất <= giá trị này thì chốt pool. Mặc định: 0.5 */
  SCORE_ACCEPTABLE_THRESHOLD: 'dispatch.score_acceptable_threshold',

  /** Mẫu số tối thiểu cho Hybrid Local Min-Max (mét). Ngăn khuếch đại chênh lệch nhỏ. Mặc định: 5000 */
  DISTANCE_DELTA_THRESHOLD_METERS: 'dispatch.distance_delta_threshold_meters',

  /** Số ca Dual Dispatch đồng thời tối đa cho mỗi tỉnh. Mặc định: 4 */
  MAX_SIMULTANEOUS_DUAL_DISPATCHES: 'dispatch.max_simultaneous_dual_dispatches',

  /** Thời gian tối đa (giây) một ca được phép nằm trong hàng đợi trước khi escalate. Mặc định: 1800 (30 phút) */
  QUEUE_TIMEOUT_SECONDS: 'dispatch.queue_timeout_seconds',
} as const;

//Giá trị mặc định tương ứng với từng key, dùng khi bảng `system_setting` chưa có dữ liệu.
export const DISPATCH_DEFAULTS = {
  RADIUS_STEPS: [5000, 10000, 20000, 40000, 50000],
  SCORE_ACCEPTABLE_THRESHOLD: 0.5,
  DISTANCE_DELTA_THRESHOLD_METERS: 5000,
  MAX_SIMULTANEOUS_DUAL_DISPATCHES: 4,
  QUEUE_TIMEOUT_SECONDS: 1800,

  /** Trọng số fallback khi không parse được weight_matrix */
  WEIGHTS: {
    dist: 0.5,
    cases: 0.3,
    skill: 0.2,
  },

  /** Weight matrix theo severity */
  WEIGHT_MATRIX: {
    CRITICAL: { dist: 0.8, cases: 0.1, skill: 0.1 },
    HIGH: { dist: 0.6, cases: 0.2, skill: 0.2 },
    DEFAULT: { dist: 0.5, cases: 0.3, skill: 0.2 },
  } as Record<string, { dist: number; cases: number; skill: number }>,

  /** Skill mapping mặc định: SosRequestType → Record<TeamType, mức lệch 0–1> */
  SKILL_MAPPING: {
    FLOOD: {
      DAN_PHONG: 0.0,
      QUAN_SU: 0.0,
      TONG_HOP: 0.2,
      PCCC: 0.6,
      Y_TE: 0.8,
      TINH_NGUYEN: 0.5,
    },
    FIRE_FIGHTING: {
      PCCC: 0.0,
      TONG_HOP: 0.3,
      QUAN_SU: 0.5,
      DAN_PHONG: 0.8,
      Y_TE: 0.9,
      TINH_NGUYEN: 0.7,
    },
    TRAFFIC_ACCIDENT: {
      Y_TE: 0.0,
      PCCC: 0.2,
      TONG_HOP: 0.3,
      DAN_PHONG: 0.6,
      QUAN_SU: 0.7,
      TINH_NGUYEN: 0.5,
    },
    MEDICAL_EMERGENCY: {
      Y_TE: 0.0,
      TONG_HOP: 0.3,
      DAN_PHONG: 0.7,
      PCCC: 0.8,
      QUAN_SU: 0.8,
      TINH_NGUYEN: 0.6,
    },
    NATURAL_DISASTER: {
      QUAN_SU: 0.0,
      DAN_PHONG: 0.2,
      TONG_HOP: 0.2,
      PCCC: 0.5,
      Y_TE: 0.6,
      TINH_NGUYEN: 0.4,
    },
    OTHER: {
      DAN_PHONG: 0.2,
      PCCC: 0.2,
      QUAN_SU: 0.2,
      TINH_NGUYEN: 0.2,
      Y_TE: 0.2,
      TONG_HOP: 0.0,
    },
  } as Record<string, Record<string, number>>,

  /** Danh sách SosRequestType luôn cần thiết bị chuyên dụng → kích hoạt Dual Dispatch */
  REQUIRES_EQUIPMENT_TYPES: ['FIRE_FIGHTING'] as string[],
} as const;
