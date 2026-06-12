export enum SosStatus {
  PENDING = 'PENDING', // Chờ được assign
  DISPATCHED = 'DISPATCHED', // Đã gán đội, đang di chuyển
  ON_SITE = 'ON_SITE', // Đội đến hiện trường
  RESOLVED = 'RESOLVED', // Đã xử lý xong
  CANCELLED = 'CANCELLED', // Bị hủy
}
