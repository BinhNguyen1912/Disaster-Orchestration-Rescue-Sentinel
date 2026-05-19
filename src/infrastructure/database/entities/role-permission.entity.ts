import { Entity, PrimaryGeneratedColumn, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { RoleEntity } from './role.entity';
import { PermissionEntity } from './permission.entity';

@Entity('role_permission')
export class RolePermissionEntity {
  @PrimaryColumn({ type: 'int' })
  roleId: number;

  @PrimaryColumn({ type: 'int' })
  permissionId: number;

  @Column({ type: 'int', nullable: true })
  grantedBy?: number;

  @CreateDateColumn()
  grantedAt: Date;

  @ManyToOne(() => RoleEntity)
  @JoinColumn({ name: 'roleId' })
  role: RoleEntity;

  @ManyToOne(() => PermissionEntity)
  @JoinColumn({ name: 'permissionId' })
  permission: PermissionEntity;

}
