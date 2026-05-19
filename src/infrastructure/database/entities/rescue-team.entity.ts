import { Entity, PrimaryGeneratedColumn, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { ProvinceEntity } from './province.entity';
import { AdministrativeUnitEntity } from './administrative-unit.entity';
import { UserEntity } from './user.entity';
import { RescueTeamMemberEntity } from './rescue-team-member.entity';
import { DutyLogEntity } from './duty-log.entity';
import { TeamAchievementEntity } from './team-achievement.entity';
import { SosRequestEntity } from './sos-request.entity';
import { CasualtyEntity } from './casualty.entity';
import { TeamStatus } from '@domain/enums/teamStatus.enum';
import { TeamType } from '@domain/enums/teamType.enum';

@Entity('rescue_team')
export class RescueTeamEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  provinceId: number;

  @Column({ type: 'int' })
  adminUnitId: number;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', unique: true })
  code: string;

  @Column({ type: 'enum', enum: TeamType })
  teamType: TeamType;

  @Column({ type: 'enum', enum: TeamStatus })
  status: TeamStatus;

  @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326, nullable: true })
  currentLocation?: any // geometry;

  @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326, nullable: true })
  baseLocation?: any // geometry;

  @Column({ type: 'geometry', spatialFeatureType: 'Polygon', srid: 4326, nullable: true })
  coverageArea?: any // geometry;

  @Column({ type: 'int', nullable: true })
  maxCapacity?: number;

  @Column({ type: 'int' })
  activeCasesCount: number;

  @Column({ type: 'varchar', array: true })
  specializations: string;

  @Column({ type: 'jsonb', nullable: true })
  equipment?: any;

  @Column({ type: 'int', nullable: true })
  leaderId?: number;

  @Column({ type: 'int' })
  totalMissions: number;

  @Column({ type: 'int' })
  totalRescued: number;

  @Column({ type: 'int' })
  totalHoursActive: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'int', nullable: true })
  createdBy?: number;

  @ManyToOne(() => ProvinceEntity)
  @JoinColumn({ name: 'provinceId' })
  province: ProvinceEntity;

  @ManyToOne(() => AdministrativeUnitEntity)
  @JoinColumn({ name: 'adminUnitId' })
  adminUnit: AdministrativeUnitEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'leaderId' })
  leader?: UserEntity | null;

  @OneToMany(() => RescueTeamMemberEntity, (entity) => entity)
  members: RescueTeamMemberEntity[];

  @OneToMany(() => DutyLogEntity, (entity) => entity.team)
  dutyLogs: DutyLogEntity[];

  @OneToMany(() => TeamAchievementEntity, (entity) => entity.team)
  achievements: TeamAchievementEntity[];

  @OneToMany(() => SosRequestEntity, (entity) => entity.assignedTeam)
  sosRequests: SosRequestEntity[];

  @OneToMany(() => CasualtyEntity, (entity) => entity.rescueTeam)
  casualties: CasualtyEntity[];

}
