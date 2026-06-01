import { IBaseRepository } from './base.repository.interface';
import { RefreshToken } from '../entities/refresh-token';

export interface IRefreshTokenRepository extends IBaseRepository<RefreshToken> {
  findByToken(token: string): Promise<RefreshToken | null>;
  revokeAllByUserId(userId: number): Promise<void>;
}
