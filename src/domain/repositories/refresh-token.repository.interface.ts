import { IBaseRepository } from './base.repository.interface';
import { RefreshToken } from '../entities/refresh-token';

export interface IRefreshTokenRepository extends IBaseRepository<RefreshToken> {
  /** Tìm refresh token theo chuỗi token */
  findByToken(token: string): Promise<RefreshToken | null>;

  /** Thu hồi toàn bộ token của một user (dùng khi phát hiện bảo mật bất thường) */
  revokeAllByUserId(userId: number): Promise<void>;
}
