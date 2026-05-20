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
import { ProvinceEntity } from './province.entity';
import { UserEntity } from './user.entity';
import { AchievementCategory } from '@domain/enums/achievementCategory.enum';

@Entity('team_achievement')
export class TeamAchievementEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  teamId: number;

  @Column({ type: 'int' })
  provinceId: number;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'varchar', nullable: true })
  description?: string;

  @Column({ type: 'timestamp' })
  achievedAt: Date;

  @Column({ type: 'int', nullable: true })
  awardedBy?: number;

  @Column({ type: 'varchar', nullable: true })
  evidenceUrl?: string;

  @Column({ type: 'enum', enum: AchievementCategory })
  category: AchievementCategory;

  @ManyToOne(() => RescueTeamEntity)
  @JoinColumn({ name: 'teamId' })
  team: RescueTeamEntity;

  @ManyToOne(() => ProvinceEntity)
  @JoinColumn({ name: 'provinceId' })
  province: ProvinceEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'awardedBy' })
  awarder?: UserEntity | null;
}
