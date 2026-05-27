import { IBaseRepository } from './base.repository.interface';
import { RefreshTokenEntity } from '@infrastructure/database/entities/refresh-token.entity';

export interface IRefreshTokenRepository extends IBaseRepository<RefreshTokenEntity> {
  findByToken(token: string): Promise<RefreshTokenEntity | null>;
  revokeAllByUserId(userId: number): Promise<void>;
}
