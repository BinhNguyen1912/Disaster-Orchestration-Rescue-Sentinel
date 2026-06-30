/**
 * Centralized WebSocket event constants
 * Dùng chung cho cả server (emit) và client (listen)
 */

// ===== /dispatch namespace =====
export const DISPATCH_EVENTS = {
  // Server → Client
  SOS_CREATED: 'sos:created', // Admin nhận SOS mới
  SOS_STATUS_UPDATED: 'sos:status-updated', // Admin nhận update trạng thái
  SOS_NO_TEAM: 'sos:no-team-available', // Admin: không có đội
  TEAM_ASSIGNED: 'sos:assigned', // Rescue team nhận nhiệm vụ
  TEAM_REASSIGNED: 'sos:reassigned', // Rescue team bị đổi nhiệm vụ
  SOS_OFFER: 'sos:offer', // Lời mời nhận việc cứu hộ
  SOS_OFFER_CLAIMED: 'sos:offer-claimed', // Thông báo có đội nhận việc thành công
  SOS_CLAIM_RESULT: 'sos:claim-result', // Phản hồi kết quả Đội trưởng click nhận việc

  // Client → Server
  JOIN_PROVINCE_ROOM: 'join:province', // Admin join room tỉnh
  JOIN_TEAM_ROOM: 'join:team', // Rescue team join room
  UPDATE_TEAM_LOCATION: 'team:update-location', // Team cập nhật vị trí GPS
  SOS_CLAIM: 'sos:claim', // Đội trưởng click nhận việc
} as const;

// ===== /notification namespace =====
export const NOTIFICATION_EVENTS = {
  // Server → Client
  PUSH: 'notification:push', // Gửi notification đến user
  BADGE_UPDATE: 'notification:badge', // Cập nhật badge count

  // Client → Server
  MARK_READ: 'notification:mark-read', // Client đánh dấu đã đọc
} as const;

// ===== /tracking namespace (future) =====
export const TRACKING_EVENTS = {
  TEAM_LOCATION_UPDATE: 'tracking:team-location', // Broadcast vị trí đội realtime
  SOS_HEATMAP_UPDATE: 'tracking:sos-heatmap', // Cập nhật heatmap SOS
} as const;
