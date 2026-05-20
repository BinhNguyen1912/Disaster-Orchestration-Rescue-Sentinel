import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from '@domain/entities/refresh-token';
import { IRefreshTokenRepository } from '@domain/repositories/refresh-token.repository.interface';
import { RefreshTokenEntity } from '../entities/refresh-token.entity';
import { BaseRepository } from './base.repository';

@Injectable()
export class RefreshTokenRepositoryImpl
  extends BaseRepository<RefreshToken, RefreshTokenEntity>
  implements IRefreshTokenRepository
{
  constructor(
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepo: Repository<RefreshTokenEntity>,
  ) {
    super(refreshTokenRepo);
  }

  protected toDomain(ormEntity: RefreshTokenEntity): RefreshToken {
    const token = new RefreshToken();
    Object.assign(token, ormEntity);
    return token;
  }

  protected toOrmEntity(
    domainEntity: Partial<RefreshToken>,
  ): Partial<RefreshTokenEntity> {
    const ormEntity = new RefreshTokenEntity();
    Object.assign(ormEntity, domainEntity);
    return ormEntity;
  }

  async findByToken(token: string): Promise<RefreshToken | null> {
    const entity = await this.refreshTokenRepo.findOne({
      where: { token },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async revokeAllByUserId(userId: number): Promise<void> {
    await this.refreshTokenRepo.update({ userId }, { isRevoked: true });
  }
}
