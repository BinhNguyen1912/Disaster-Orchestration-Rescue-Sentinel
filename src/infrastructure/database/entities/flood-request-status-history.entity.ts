import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { SosRequestEntity } from './sos-request.entity';
import { RescueTeamEntity } from './rescue-team.entity';
import { FloodRequestEntity } from './flood-request.entity';

@Entity('flood_request_status_history')
export class FloodRequestStatusHistoryEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'flood_request_id' })
  floodRequestId: number;

  @Column({ type: 'varchar', name: 'from_status', length: 50, nullable: true })
  fromStatus?: string | null;

  @Column({ type: 'varchar', name: 'to_status', length: 50 })
  toStatus: string;

  @Column({ type: 'int', name: 'changed_by', nullable: true })
  changedBy?: number | null;

  @CreateDateColumn({ name: 'changed_at' })
  changedAt: Date;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ type: 'int', name: 'sos_id', nullable: true })
  sosId?: number | null;

  @Column({ type: 'int', name: 'rescue_team_id', nullable: true })
  rescueTeamId?: number | null;

  @ManyToOne(() => FloodRequestEntity, (fr) => fr.statusHistory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'flood_request_id' })
  floodRequest: FloodRequestEntity;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'changed_by' })
  changer?: UserEntity | null;

  @ManyToOne(() => SosRequestEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sos_id' })
  sos?: SosRequestEntity | null;

  @ManyToOne(() => RescueTeamEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'rescue_team_id' })
  rescueTeam?: RescueTeamEntity | null;
}
