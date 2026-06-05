import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '@infrastructure/database/entities/user.entity';
import {
  IUserRepository,
  QueryUserParams,
} from '../../../domain/repositories/user.repository.interface';
import { PaginatedResult } from '@shared/common/dtos/pagination.dto';
import { User } from '../../../domain/entities/user.entity';

@Injectable()
export class UserRepositoryImpl implements IUserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,
  ) {}

  async findById(id: number): Promise<User | null> {
    const user = await this.repo.findOne({
      where: { id },
      relations: ['province', 'adminUnit', 'userRoles', 'userRoles.role'],
    });
    return user;
  }

  async findByPhone(phone: string): Promise<User | null> {
    const user = await this.repo.findOne({ where: { phone } });
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.repo.findOne({ where: { email } });
    return user;
  }

  async findByNationalId(nationalId: string): Promise<User | null> {
    const user = await this.repo.findOne({ where: { nationalId } });
    return user;
  }

  async findAll(
    filters: QueryUserParams,
    pagination: { page: number; limit: number },
  ): Promise<PaginatedResult<User>> {
    const { page, limit } = pagination;
    const { provinceId, adminUnitId, isActive, isVerified, search } = filters;

    const queryBuilder = this.repo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.province', 'province')
      .leftJoinAndSelect('user.adminUnit', 'adminUnit')
      .leftJoinAndSelect('user.userRoles', 'userRoles')
      .leftJoinAndSelect('userRoles.role', 'role')
      .where('user.deletedAt IS NULL');

    if (provinceId) {
      queryBuilder.andWhere('user.provinceId = :provinceId', { provinceId });
    }

    if (adminUnitId) {
      queryBuilder.andWhere('user.adminUnitId = :adminUnitId', { adminUnitId });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('user.isActive = :isActive', { isActive });
    }

    if (isVerified !== undefined) {
      queryBuilder.andWhere('user.isVerified = :isVerified', { isVerified });
    }

    if (search) {
      queryBuilder.andWhere(
        '(user.fullName LIKE :search OR user.phone LIKE :search OR user.email LIKE :search OR user.nationalId LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [items, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('user.createdAt', 'DESC')
      .getManyAndCount();

    return {
      items: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(data: Partial<User>): Promise<User> {
    const user = this.repo.create(data as any);
    return (await this.repo.save(user)) as unknown as User;
  }

  async update(id: number, data: Partial<User>): Promise<User | null> {
    const existing = await this.repo.findOne({ where: { id } });
    if (!existing) return null;
    Object.assign(existing, data);
    return await this.repo.save(existing);
  }

  async softDelete(id: number): Promise<boolean> {
    const result = await this.repo.update(id, {
      deletedAt: new Date(),
      isActive: false,
    });
    return (result.affected ?? 0) > 0;
  }

  async count(conditions: Partial<User>): Promise<number> {
    return this.repo.count({ where: conditions });
  }

  async search(query: string): Promise<User[]> {
    const users = await this.repo
      .createQueryBuilder('user')
      .where('user.deletedAt IS NULL')
      .andWhere(
        '(user.fullName LIKE :query OR user.phone LIKE :query OR user.email LIKE :query)',
        { query: `%${query}%` },
      )
      .take(20)
      .getMany();
    return users;
  }
}
