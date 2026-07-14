import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { UserEntity } from '@infrastructure/database/entities/user.entity';
import { UserRoleEntity } from '@infrastructure/database/entities/user-role.entity';
import { RoleEntity } from '@infrastructure/database/entities/role.entity';
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
  ) { }

  async findById(id: number): Promise<User | null> {
    const user = await this.repo.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['province', 'adminUnit', 'userRoles', 'userRoles.role'],
    });
    return user;
  }

  async findByPhone(phone: string): Promise<User | null> {
    const user = await this.repo.findOne({
      where: { phone, deletedAt: IsNull() },
    });
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.repo.findOne({
      where: { email, deletedAt: IsNull() },
    });
    return user;
  }

  async findByNationalId(nationalId: string): Promise<User | null> {
    const user = await this.repo.findOne({
      where: { nationalId, deletedAt: IsNull() },
    });
    return user;
  }

  async findAll(
    filters: QueryUserParams,
    pagination: { page: number; limit: number },
  ): Promise<PaginatedResult<User>> {
    const { page, limit } = pagination;
    const { provinceId, adminUnitId, isActive, isVerified, search, roleId, isVolunteer, needsHelp } = filters;

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

    if (roleId) {
      queryBuilder.andWhere(
        'EXISTS (SELECT 1 FROM user_role ur WHERE ur."userId" = user.id AND ur."roleId" = :roleId AND ur."isActive" = true)',
        { roleId }
      );
    }

    if (isVolunteer !== undefined) {
      queryBuilder.andWhere('user.isVolunteer = :isVolunteer', { isVolunteer });
    }

    if (needsHelp !== undefined) {
      queryBuilder.andWhere('user.needsHelp = :needsHelp', { needsHelp });
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
      items,
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

  async update(
    id: number,
    data: Partial<User> & { roleId?: number },
  ): Promise<User | null> {
    const existing = await this.repo.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!existing) return null;

    const { roleId, ...userData } = data;
    Object.assign(existing, userData);

    if (roleId !== undefined) {
      const role = await this.repo.manager.findOne(RoleEntity, {
        where: { id: roleId },
      });
      if (role) {
        existing.isVolunteer = role.name === 'VOLUNTEER';
      }
    }

    await this.repo.save(existing);

    if (roleId !== undefined) {
      const userRoleRepo = this.repo.manager.getRepository(UserRoleEntity);
      const activeRole = await userRoleRepo.findOne({
        where: { userId: id, isActive: true },
      });

      if (activeRole) {
        let changed = false;
        if (activeRole.roleId !== roleId) {
          activeRole.roleId = roleId;
          activeRole.assignedAt = new Date();
          changed = true;
        }
        if (activeRole.provinceId !== existing.provinceId) {
          activeRole.provinceId = existing.provinceId;
          changed = true;
        }
        if (changed) {
          await userRoleRepo.save(activeRole);
        }
      } else {
        const newRole = userRoleRepo.create({
          userId: id,
          roleId: roleId,
          provinceId: existing.provinceId || 1,
          isActive: true,
          assignedAt: new Date(),
        });
        await userRoleRepo.save(newRole);
      }
    }

    return this.findById(id);
  }

  async softDelete(id: number): Promise<boolean> {
    const result = await this.repo.update(id, {
      deletedAt: new Date(),
      isActive: false,
    });
    return (result.affected ?? 0) > 0;
  }

  async count(conditions: any): Promise<number> {
    const { roleId, ...rest } = conditions;
    const queryBuilder = this.repo.createQueryBuilder('user').where('user.deletedAt IS NULL');

    Object.keys(rest).forEach((key) => {
      queryBuilder.andWhere(`user.${key} = :${key}`, { [key]: rest[key] });
    });

    if (roleId) {
      queryBuilder.andWhere(
        'EXISTS (SELECT 1 FROM user_role ur WHERE ur."userId" = user.id AND ur."roleId" = :roleId AND ur."isActive" = true)',
        { roleId }
      );
    }

    return queryBuilder.getCount();
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

  async bulkUpdate(
    ids: number[],
    data: { roleId?: number; isActive?: boolean },
  ): Promise<{ updated: number }> {
    const userRoleRepo = this.repo.manager.getRepository(UserRoleEntity);
    let updatedCount = 0;

    let isVolunteerRole = false;
    if (data.roleId !== undefined) {
      const role = await this.repo.manager.findOne(RoleEntity, {
        where: { id: data.roleId },
      });
      if (role) {
        isVolunteerRole = role.name === 'VOLUNTEER';
      }
    }

    for (const id of ids) {
      const user = await this.repo.findOne({ where: { id, deletedAt: IsNull() } });
      if (!user) continue;

      if (data.isActive !== undefined) {
        user.isActive = data.isActive;
      }
      if (data.roleId !== undefined) {
        user.isVolunteer = isVolunteerRole;
      }
      await this.repo.save(user);

      if (data.roleId !== undefined) {
        const activeRole = await userRoleRepo.findOne({
          where: { userId: id, isActive: true },
        });

        if (activeRole) {
          let changed = false;
          if (activeRole.roleId !== data.roleId) {
            activeRole.roleId = data.roleId;
            activeRole.assignedAt = new Date();
            changed = true;
          }
          if (activeRole.provinceId !== user.provinceId) {
            activeRole.provinceId = user.provinceId;
            changed = true;
          }
          if (changed) {
            await userRoleRepo.save(activeRole);
          }
        } else {
          const newRole = userRoleRepo.create({
            userId: id,
            roleId: data.roleId,
            provinceId: user.provinceId || 1,
            isActive: true,
          });
          await userRoleRepo.save(newRole);
        }
      }
      updatedCount++;
    }

    return { updated: updatedCount };
  }

  async findRoleIdByName(name: string): Promise<number | null> {
    const names = name === 'RESIDENT' || name === 'USER' ? ['RESIDENT', 'USER'] : [name];
    const role = await this.repo.manager.findOne(RoleEntity, {
      where: names.map((n) => ({ name: n })) as any,
    });
    return role ? role.id : null;
  }
}
