export class RefreshToken {
  id: number;
  token: string;
  userId: number;
  expiresAt: Date;
  isRevoked: boolean;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;

  /** Kiểm tra token có còn hạn sử dụng không */
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  /** Thu hồi token này */
  revoke(): void {
    this.isRevoked = true;
  }

  /** Kiểm tra token có hợp lệ (không bị revoke và chưa hết hạn) */
  isValid(): boolean {
    return !this.isRevoked && !this.isExpired();
  }
}
