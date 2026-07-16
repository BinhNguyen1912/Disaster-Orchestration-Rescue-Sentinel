import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SystemNotificationEntity } from './sys-notification.entity';
import { UserEntity } from './user.entity';

@Entity('notification_recipients')
export class NotificationRecipientEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'int' })
  notificationId: number;

  @Column({ type: 'int' })
  userId: number;

  @Column({ type: 'varchar' })
  channel: string; // APP, PUSH, SMS, EMAIL, ZALO

  @Column({ type: 'varchar', default: 'PENDING' })
  status: string; // PENDING, SENT, FAILED, READ

  @Column({ type: 'timestamp', nullable: true })
  receivedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  readAt?: Date;

  @ManyToOne(() => SystemNotificationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'notificationId' })
  notification: SystemNotificationEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;
}
