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

@Entity('device')
export class DeviceEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  userId: number;

  @Column({ type: 'varchar', unique: true })
  deviceId: string;

  @Column({ type: 'varchar', nullable: true })
  fcmToken?: string;

  @Column({ type: 'varchar', nullable: true })
  deviceType?: string;

  @Column({ type: 'varchar', nullable: true })
  deviceModel?: string;

  @Column({ type: 'varchar', nullable: true })
  osVersion?: string;

  @CreateDateColumn()
  lastActiveAt: Date;

  @Column({ type: 'boolean' })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'userId' })
  user: UserEntity;
}
