import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IRoleRepository } from '../../../domain/repositories/role.repository.interface';
import { RoleEntity } from '@infrastructure/database/entities/role.entity';

@Injectable()
export class RoleRepositoryImpl implements IRoleRepository {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly repo: Repository<RoleEntity>,
  ) {}

  async findById(id: number): Promise<RoleEntity | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['province'],
    });
  }

  async findAll(
    filters: { isActive?: boolean; search?: string },
    pagination: { page: number; limit: number },
  ): Promise<{ items: RoleEntity[]; total: number }> {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const queryBuilder = this.repo.createQueryBuilder('role');

    if (filters.isActive !== undefined) {
      queryBuilder.andWhere('role.isActive = :isActive', {
        isActive: filters.isActive,
      });
    }

    if (filters.search) {
      queryBuilder.andWhere('role.name ILIKE :search', {
        search: `%${filters.search}%`,
      });
    }

    const [items, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { items, total };
  }

  async create(data: Partial<RoleEntity>): Promise<RoleEntity> {
    return this.repo.save(this.repo.create(data));
  }

  async update(
    id: number,
    data: Partial<RoleEntity>,
  ): Promise<RoleEntity | null> {
    const existing = await this.repo.findOne({ where: { id } });
    if (!existing) return null;
    return this.repo.save({ ...existing, ...data });
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.repo.delete(id);
    return result.affected ? result.affected > 0 : false;
  }
}
