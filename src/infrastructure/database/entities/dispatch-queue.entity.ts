import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { SosRequestEntity } from './sos-request.entity';
import { RescueTeamEntity } from './rescue-team.entity';
import { ProvinceEntity } from './province.entity';

@Entity('dispatch_queue')
@Index('idx_dispatch_queue_team_priority', [
  'teamId',
  'priorityScore',
  'queuedAt',
])
export class DispatchQueueEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  sosRequestId: number;

  @Column({ type: 'int' })
  teamId: number;

  @Column({ type: 'int' })
  provinceId: number;

  @Column({ type: 'boolean', default: false })
  isDualDispatch: boolean;

  @Column({ type: 'float' })
  priorityScore: number;

  @CreateDateColumn()
  queuedAt: Date;

  @ManyToOne(() => SosRequestEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sosRequestId' })
  sosRequest: SosRequestEntity;

  @ManyToOne(() => RescueTeamEntity)
  @JoinColumn({ name: 'teamId' })
  team: RescueTeamEntity;

  @ManyToOne(() => ProvinceEntity)
  @JoinColumn({ name: 'provinceId' })
  province: ProvinceEntity;
}
