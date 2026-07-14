import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { NotificationEventEntity } from './notification-event.entity';
import { NotificationTemplateEntity } from './notification-template.entity';
import { UserEntity } from './user.entity';

@Entity('notifications')
export class SystemNotificationEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  eventId: number;

  @Column({ type: 'int' })
  templateId: number;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', default: 'LOW' })
  priority: string;

  @Column({ type: 'jsonb', nullable: true })
  data: any;

  @Column({ type: 'varchar', default: 'PENDING' })
  status: string; // PENDING, PROCESSING, SENT, FAILED

  @Column({ type: 'int', nullable: true })
  createdBy?: number;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => NotificationEventEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: NotificationEventEntity;

  @ManyToOne(() => NotificationTemplateEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'templateId' })
  template: NotificationTemplateEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'createdBy' })
  creator?: UserEntity;
}
