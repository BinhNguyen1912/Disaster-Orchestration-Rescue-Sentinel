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
  CREATED = 'CREATED', // Tạo SOS
  STATUS_CHANGED = 'STATUS_CHANGED', // Thay đổi trạng thái
  TEAM_ASSIGNED = 'TEAM_ASSIGNED', // Được giao team
  TEAM_REASSIGNED = 'TEAM_REASSIGNED', // Được giao lại team
  TEAM_RELEASED = 'TEAM_RELEASED', // Bị hủy giao team
  CANCELLED = 'CANCELLED', // Bị hủy
  RESOLVED = 'RESOLVED', // Đã xử lý
  QUEUED = 'QUEUED', // Đang chờ chuyên gia
  SPECIALIST_PENDING = 'SPECIALIST_PENDING', // Đang chờ chuyên gia
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

  @Column({ type: 'int', nullable: true })
  teamId?: number | null;

  @Column({ type: 'int', nullable: true })
  previousTeamId?: number | null;

  @Column({ type: 'enum', enum: DispatchMethod, nullable: true })
  dispatchMethod?: DispatchMethod | null;

  @Column({ type: 'varchar', nullable: true })
  note?: string | null;

  @CreateDateColumn()
  createdAt: Date;

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
