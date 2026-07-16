import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { NotificationEventEntity } from './notification-event.entity';
import { NotificationTemplateGroupEntity } from './notification-template-group.entity';
import { ProvinceEntity } from './province.entity';

@Entity('notification_templates')
export class NotificationTemplateEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  eventId: number;

  @Column({ type: 'int' })
  groupId: number;

  @Column({ type: 'varchar', unique: true })
  code: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  titleTemplate: string;

  @Column({ type: 'text' })
  contentTemplate: string;

  @Column({ type: 'varchar', default: 'LOW' })
  defaultPriority: string;

  @Column({ type: 'simple-array', default: 'APP' })
  defaultChannels: string[];

  @Column({ type: 'jsonb', nullable: true })
  variables: any;

  @Column({ type: 'int', nullable: true })
  provinceId?: number;

  @ManyToOne(() => ProvinceEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'provinceId' })
  province?: ProvinceEntity;

  @Column({ type: 'boolean', default: false })
  isDefault: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => NotificationEventEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: NotificationEventEntity;

  @ManyToOne(() => NotificationTemplateGroupEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: NotificationTemplateGroupEntity;
}
