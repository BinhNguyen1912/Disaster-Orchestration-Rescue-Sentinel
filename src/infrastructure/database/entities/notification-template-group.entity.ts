import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('notification_template_groups')
export class NotificationTemplateGroupEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', unique: true })
  code: string;

  @Column({ type: 'varchar' })
  name: string;

  @CreateDateColumn()
  createdAt: Date;
}
