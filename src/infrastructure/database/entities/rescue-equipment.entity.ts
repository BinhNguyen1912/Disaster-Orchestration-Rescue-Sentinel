import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { RescueTeamEntity } from './rescue-team.entity';
import { EquipmentStatus } from '@shared/index';

@Entity('rescue_equipment')
export class RescueEquipmentEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  teamId: number;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({
    type: 'enum',
    enum: EquipmentStatus,
    default: EquipmentStatus.GOOD,
  })
  status: EquipmentStatus;

  @Column({ type: 'varchar', nullable: true })
  description?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => RescueTeamEntity)
  @JoinColumn({ name: 'teamId' })
  team: RescueTeamEntity;
}
