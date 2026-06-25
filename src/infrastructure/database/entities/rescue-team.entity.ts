import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
  JoinColumn,
} from 'typeorm';
import { ProvinceEntity } from './province.entity';
import { AdministrativeUnitEntity } from './administrative-unit.entity';
import { UserEntity } from './user.entity';
import { RescueTeamMemberEntity } from './rescue-team-member.entity';
import { DutyLogEntity } from './duty-log.entity';
import { TeamAchievementEntity } from './team-achievement.entity';
import { SosRequestEntity } from './sos-request.entity';
import { CasualtyEntity } from './casualty.entity';
import { TeamSpecializationEntity } from './team-specialization.entity';
import { TeamStatus } from '@shared/core/enums/teamStatus.enum';
import { TeamType } from '@shared/core/enums/teamType.enum';

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

  @Column({ type: 'enum', enum: TeamType, nullable: true })
  teamType?: TeamType;

  @Column({ type: 'enum', enum: TeamStatus, default: TeamStatus.AVAILABLE })
  status: TeamStatus;

  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  currentLocation?: any; // geometry;

  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  baseLocation?: any; // geometry;

  @Column({
    type: 'geometry',
    spatialFeatureType: 'Polygon',
    srid: 4326,
    nullable: true,
  })
  coverageArea?: any; // geometry;

  @Column({ type: 'int', nullable: true })
  maxCapacity?: number;

  @Column({ type: 'int', default: 0 })
  activeCasesCount: number;

  @ManyToMany(() => TeamSpecializationEntity)
  @JoinTable({
    name: 'rescue_team_specialization',
    joinColumn: { name: 'rescueTeamId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'specializationId', referencedColumnName: 'id' },
  })
  specializations: TeamSpecializationEntity[];

  @Column({ type: 'int', nullable: true })
  leaderId?: number;

  @Column({ type: 'varchar', nullable: true })
  leaderCitizenName?: string;

  @Column({ type: 'varchar', nullable: true })
  leaderPhone?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logoUrl?: string | null;

  @Column({ type: 'int', default: 0 })
  totalMissions: number;

  @Column({ type: 'int', default: 0 })
  totalRescued: number;

  @Column({ type: 'int', default: 0 })
  totalHoursActive: number;

  @Column({ type: 'varchar', nullable: true })
  email?: string;

  @Column({ type: 'timestamp', nullable: true })
  foundingDate?: Date;

  @Column({ type: 'varchar', nullable: true })
  baseLocationAddress?: string;

  @Column({ type: 'float', nullable: true })
  coverageAreaSize?: number;

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
