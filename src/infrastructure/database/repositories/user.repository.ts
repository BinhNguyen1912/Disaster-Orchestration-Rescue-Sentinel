import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@domain/entities/user';
import { IUserRepository } from '@domain/repositories/user.repository.interface';
import { UserEntity } from '../entities/user.entity';
import { UserRoleEntity } from '../entities/user-role.entity';
import { BaseRepository } from './base.repository';

@Injectable()
export class UserRepositoryImpl
  extends BaseRepository<User, UserEntity>
  implements IUserRepository
{
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(UserRoleEntity)
    private readonly userRoleRepository: Repository<UserRoleEntity>,
  ) {
    super(userRepository);
  }

  protected toDomain(ormEntity: UserEntity): User {
    const user = new User();
    Object.assign(user, ormEntity);
    return user;
  }

  protected toOrmEntity(domainEntity: Partial<User>): Partial<UserEntity> {
    const ormEntity = new UserEntity();
    Object.assign(ormEntity, domainEntity);
    return ormEntity;
  }

  async findByIdentifier(identifier: string): Promise<User | null> {
    const entity = await this.userRepository.findOne({
      where: [{ email: identifier }, { phone: identifier }],
      relations: ['userRoles', 'userRoles.role'],
    });

    return entity ? this.toDomain(entity) : null;
  }

  async findByResetToken(resetToken: string): Promise<User | null> {
    const entity = await this.userRepository.findOne({
      where: { passwordResetToken: resetToken },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async assignRole(
    userId: number,
    roleId: number,
    provinceId: number,
    assignedBy?: number,
  ): Promise<void> {
    const userRole = this.userRoleRepository.create({
      userId,
      roleId,
      provinceId,
      assignedBy,
      isActive: true,
    });
    await this.userRoleRepository.save(userRole);
  }
}
