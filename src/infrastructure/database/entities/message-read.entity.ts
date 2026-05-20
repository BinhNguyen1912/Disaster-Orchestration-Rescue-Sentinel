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
import { MessageEntity } from './message.entity';
import { UserEntity } from './user.entity';

@Entity('message_read')
export class MessageReadEntity {
  @PrimaryColumn({ type: 'int' })
  messageId: number;

  @PrimaryColumn({ type: 'int' })
  userId: number;

  @CreateDateColumn()
  readAt: Date;

  @ManyToOne(() => MessageEntity)
  @JoinColumn({ name: 'messageId' })
  message: MessageEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'userId' })
  user: UserEntity;
}
