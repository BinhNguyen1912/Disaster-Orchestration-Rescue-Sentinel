import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { SystemNotificationEntity } from './sys-notification.entity';
import { NotificationRecipientEntity } from './notification-recipient.entity';

@Entity('notification_logs')
export class NotificationLogEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'int' })
  notificationId: number;

  @Column({ type: 'bigint' })
  recipientId: number;

  @Column({ type: 'varchar' })
  channel: string;

  @Column({ type: 'varchar' })
  status: string; // SUCCESS, FAILED

  @Column({ type: 'text', nullable: true })
  message?: string;

  @CreateDateColumn()
  sentAt: Date;

  @ManyToOne(() => SystemNotificationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'notificationId' })
  notification: SystemNotificationEntity;

  @ManyToOne(() => NotificationRecipientEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipientId' })
  recipient: NotificationRecipientEntity;
}
