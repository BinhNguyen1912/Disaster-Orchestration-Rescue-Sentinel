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
import { UserEntity } from './user.entity';
import { RescueTeamEntity } from './rescue-team.entity';
import { SosStatus } from '@shared/core/enums/sosStatus.enum';
import { DispatchMethod } from '@shared/core/enums/dispatchMethod.enum';

export enum SosHistoryEventType {
  CREATED = 'CREATED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  TEAM_ASSIGNED = 'TEAM_ASSIGNED',
  TEAM_REASSIGNED = 'TEAM_REASSIGNED',
  TEAM_RELEASED = 'TEAM_RELEASED',
  CANCELLED = 'CANCELLED',
  RESOLVED = 'RESOLVED',
  QUEUED = 'QUEUED',
  SPECIALIST_PENDING = 'SPECIALIST_PENDING',
}

@Entity('sos_status_history')
@Index(['sosRequestId', 'createdAt'])
export class SosStatusHistoryEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  sosRequestId: number;

  @Column({ type: 'enum', enum: SosHistoryEventType })
  eventType: SosHistoryEventType;

  @Column({ type: 'enum', enum: SosStatus, nullable: true })
  fromStatus?: SosStatus | null;

  @Column({ type: 'enum', enum: SosStatus, nullable: true })
  toStatus?: SosStatus | null;

  @Column({ type: 'int', nullable: true })
  changedById?: number | null;

  /** Đội cứu hộ được gán (nếu có thay đổi đội) */
  @Column({ type: 'int', nullable: true })
  teamId?: number | null;

  /** Đội cũ bị thay thế (chỉ dùng khi TEAM_REASSIGNED) */
  @Column({ type: 'int', nullable: true })
  previousTeamId?: number | null;

  @Column({ type: 'enum', enum: DispatchMethod, nullable: true })
  dispatchMethod?: DispatchMethod | null;

  @Column({ type: 'varchar', nullable: true })
  note?: string | null;

  @CreateDateColumn()
  createdAt: Date;

  // ── Relations ────────────────────────────────────────────────────────────────

  @ManyToOne(() => SosRequestEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sosRequestId' })
  sosRequest: SosRequestEntity;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'changedById' })
  changedBy?: UserEntity | null;

  @ManyToOne(() => RescueTeamEntity, { nullable: true })
  @JoinColumn({ name: 'teamId' })
  team?: RescueTeamEntity | null;
}
