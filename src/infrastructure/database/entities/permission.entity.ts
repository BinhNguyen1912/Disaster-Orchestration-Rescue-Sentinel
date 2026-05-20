import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { RolePermissionEntity } from './role-permission.entity';

@Entity('permission')
export class PermissionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  module: string;

  @Column({ type: 'varchar', nullable: true })
  description?: string;

  @Column({ type: 'boolean' })
  isSystem: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'int', nullable: true })
  createdBy?: number;

  @Column({ type: 'int', nullable: true })
  updatedBy?: number;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'createdBy' })
  creator?: UserEntity | null;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'updatedBy' })
  updater?: UserEntity | null;

  @OneToMany(() => RolePermissionEntity, (entity) => entity.permission)
  rolePermissions: RolePermissionEntity[];
}
