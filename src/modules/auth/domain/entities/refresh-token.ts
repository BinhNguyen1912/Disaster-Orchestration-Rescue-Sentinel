export interface RefreshToken {
  id: number;
  token: string;
  userId: number;
  expiresAt: Date;
  isRevoked: boolean;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: Date;
}
