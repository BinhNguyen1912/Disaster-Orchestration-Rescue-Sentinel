import {
  RescueTeamEntity,
  UserEntity,
} from '@infrastructure/database/entities';
import { RoleInTeam } from '@shared/index';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

@Entity('rescue_team_member')
@Index('uq_active_user_member', ['userId'], { unique: true, where: '"isActive" = true AND "userId" IS NOT NULL' })
export class RescueTeamMemberEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  teamId: number;

  @Column({ type: 'int', nullable: true })
  userId: number | null;

  @Column({ type: 'varchar', nullable: true })
  citizenName: string | null;

  @Column({ type: 'varchar', nullable: true })
  citizenPhone: string | null;

  @Column({ type: 'enum', enum: RoleInTeam })
  roleInTeam: RoleInTeam;

  @Column({ type: 'timestamp' })
  joinedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  leftAt?: Date;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', array: true, nullable: true })
  specializationIds: number[];

  @Column({ type: 'int', default: 0 })
  missionsCount: number;

  @Column({ type: 'int', default: 0 })
  rescuedCount: number;

  @Column({ type: 'int', default: 0 })
  hoursActive: number;

  @ManyToOne(() => RescueTeamEntity)
  @JoinColumn({ name: 'teamId' })
  team: RescueTeamEntity;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: UserEntity | null;
}
