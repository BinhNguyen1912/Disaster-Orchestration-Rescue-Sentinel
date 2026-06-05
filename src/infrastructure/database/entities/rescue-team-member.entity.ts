import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { RescueTeamEntity } from './rescue-team.entity';
import { UserEntity } from './user.entity';
import { RoleInTeam } from '@shared/core/enums/roleInTeam.enum';

@Entity('rescue_team_member')
export class RescueTeamMemberEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  teamId: number;

  @Column({ type: 'int', unique: true })
  userId: number;

  @Column({ type: 'enum', enum: RoleInTeam })
  roleInTeam: RoleInTeam;

  @Column({ type: 'timestamp' })
  joinedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  leftAt?: Date;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'varchar', array: true })
  specializations: string;

  @Column({ type: 'int', default: 0 })
  missionsCount: number;

  @Column({ type: 'int', default: 0 })
  rescuedCount: number;

  @Column({ type: 'int', default: 0 })
  hoursActive: number;

  @ManyToOne(() => RescueTeamEntity)
  @JoinColumn({ name: 'teamId' })
  team: RescueTeamEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'userId' })
  user: UserEntity;
}
