import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('system_setting')
export class SystemSettingEntity {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  key: string;

  @Column({ type: 'text' })
  value: string;

  @Column({ type: 'varchar', length: 50 })
  group: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
