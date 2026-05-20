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
import { ProvinceEntity } from './province.entity';
import { UserEntity } from './user.entity';
import { MessageReadEntity } from './message-read.entity';
import { MessageType } from '@domain/enums/messageType.enum';
import { TargetType } from '@domain/enums/targetType.enum';
import { MessageChannel } from '@domain/enums/messageChannel.enum';

@Entity('message')
export class MessageEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  provinceId: number;

  @Column({ type: 'int', nullable: true })
  senderId?: number;

  @Column({ type: 'enum', enum: MessageType })
  messageType: MessageType;

  @Column({ type: 'enum', enum: MessageChannel })
  channel: MessageChannel;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'varchar' })
  content: string;

  @Column({ type: 'varchar', nullable: true })
  imageUrl?: string;

  @Column({ type: 'enum', enum: TargetType })
  targetType: TargetType;

  @Column({ type: 'int', nullable: true })
  targetId?: number;

  @Column({ type: 'varchar', array: true })
  targetRoles: string;

  @Column({ type: 'int' })
  sentCount: number;

  @Column({ type: 'int' })
  readCount: number;

  @Column({ type: 'timestamp', nullable: true })
  sentAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => ProvinceEntity)
  @JoinColumn({ name: 'provinceId' })
  province: ProvinceEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'senderId' })
  sender?: UserEntity | null;

  @OneToMany(() => MessageReadEntity, (entity) => entity.message)
  reads: MessageReadEntity[];
}
