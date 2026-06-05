import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
} from 'typeorm';
import { TeamType } from '@shared/core/enums/teamType.enum';
import { RescueTeamEntity } from './rescue-team.entity';

@Entity('team_specialization')
export class TeamSpecializationEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'enum', enum: TeamType })
  teamType: TeamType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToMany(() => RescueTeamEntity, (team) => team.specializations)
  rescueTeams: RescueTeamEntity[];
}
