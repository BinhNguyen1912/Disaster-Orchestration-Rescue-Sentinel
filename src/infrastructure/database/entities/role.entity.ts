import { Entity, PrimaryGeneratedColumn, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { ProvinceEntity } from './province.entity';
import { UserEntity } from './user.entity';
import { RolePermissionEntity } from './role-permission.entity';
import { UserRoleEntity } from './user-role.entity';

@Entity('role')
export class RoleEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  provinceId?: number;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  description?: string;

  @Column({ type: 'int' })
  level: number;

  @Column({ type: 'boolean' })
  isSystem: boolean;

  @Column({ type: 'boolean' })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'int', nullable: true })
  createdBy?: number;

  @ManyToOne(() => ProvinceEntity)
  @JoinColumn({ name: 'provinceId' })
  province?: ProvinceEntity | null;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'createdBy' })
  creator?: UserEntity | null;

  @OneToMany(() => RolePermissionEntity, (entity) => entity.role)
  rolePermissions: RolePermissionEntity[];

  @OneToMany(() => UserRoleEntity, (entity) => entity.role)
  userRoles: UserRoleEntity[];

}
