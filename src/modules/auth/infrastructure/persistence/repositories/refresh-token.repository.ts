import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IRefreshTokenRepository } from '../../../domain/repositories/refresh-token.repository.interface';
import { RefreshTokenEntity } from '@infrastructure/database/entities/refresh-token.entity';

@Injectable()
export class RefreshTokenRepositoryImpl implements IRefreshTokenRepository {
  constructor(
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepo: Repository<RefreshTokenEntity>,
  ) {}

  async findById(id: number): Promise<RefreshTokenEntity | null> {
    return this.refreshTokenRepo.findOne({ where: { id } });
  }

  async findAll(): Promise<RefreshTokenEntity[]> {
    return this.refreshTokenRepo.find();
  }

  async findAndCount(): Promise<[RefreshTokenEntity[], number]> {
    return this.refreshTokenRepo.findAndCount();
  }

  async create(data: Partial<RefreshTokenEntity>): Promise<RefreshTokenEntity> {
    return this.refreshTokenRepo.save(this.refreshTokenRepo.create(data));
  }

  async createMany(
    data: Partial<RefreshTokenEntity>[],
  ): Promise<RefreshTokenEntity[]> {
    return this.refreshTokenRepo.save(this.refreshTokenRepo.create(data));
  }

  async update(
    id: number,
    data: Partial<RefreshTokenEntity>,
  ): Promise<RefreshTokenEntity | null> {
    const existing = await this.refreshTokenRepo.findOne({ where: { id } });
    if (!existing) return null;
    return this.refreshTokenRepo.save({ ...existing, ...data });
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.refreshTokenRepo.delete(id);
    return result.affected ? result.affected > 0 : false;
  }

  async findByToken(token: string): Promise<RefreshTokenEntity | null> {
    return this.refreshTokenRepo.findOne({ where: { token } });
  }

  async revokeAllByUserId(userId: number): Promise<void> {
    await this.refreshTokenRepo.update({ userId }, { isRevoked: true });
  }
}
