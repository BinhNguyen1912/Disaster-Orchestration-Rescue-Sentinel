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
import { ProvinceEntity } from './province.entity';
import { UserEntity } from './user.entity';
import { HouseholdProfileEntity } from './household-profile.entity';
import { RescueTeamEntity } from './rescue-team.entity';
import { DutyLogEntity } from './duty-log.entity';
import { SosRequestEntity } from './sos-request.entity';
import { FloodReportEntity } from './flood-report.entity';
import { CasualtyEntity } from './casualty.entity';
import { FloodZoneEntity } from './flood-zone.entity';
import { InfrastructureLayerEntity } from './infrastructure-layer.entity';
import { AdministrativeUnitType } from '@shared/core/enums/administrativeUnitType.enum';

@Entity('administrative_unit')
export class AdministrativeUnitEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  provinceId: number;

  @Column({ type: 'int', nullable: true })
  parentId?: number;

  @Column({ type: 'enum', enum: AdministrativeUnitType })
  type: AdministrativeUnitType;

  @Column({ type: 'varchar' })
  code: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({
    type: 'geometry',
    spatialFeatureType: 'MultiPolygon',
    srid: 4326,
    nullable: true,
  })
  boundary?: any; // geometry;

  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  centerPoint?: any; // geometry;

  @ManyToOne(() => ProvinceEntity)
  @JoinColumn({ name: 'provinceId' })
  province: ProvinceEntity;

  @ManyToOne(() => AdministrativeUnitEntity)
  @JoinColumn({ name: 'parentId' })
  parent?: AdministrativeUnitEntity | null;

  @OneToMany(() => AdministrativeUnitEntity, (entity) => entity.parent)
  subUnits: AdministrativeUnitEntity[];

  @OneToMany(() => UserEntity, (entity) => entity.adminUnit)
  users: UserEntity[];

  @OneToMany(() => HouseholdProfileEntity, (entity) => entity.adminUnit)
  householdProfiles: HouseholdProfileEntity[];

  @OneToMany(() => RescueTeamEntity, (entity) => entity.adminUnit)
  rescueTeams: RescueTeamEntity[];

  @OneToMany(() => DutyLogEntity, (entity) => entity.adminUnit)
  dutyLogs: DutyLogEntity[];

  @OneToMany(() => SosRequestEntity, (entity) => entity.adminUnit)
  sosRequests: SosRequestEntity[];

  @OneToMany(() => FloodReportEntity, (entity) => entity.adminUnit)
  floodReports: FloodReportEntity[];

  @OneToMany(() => CasualtyEntity, (entity) => entity.adminUnit)
  casualties: CasualtyEntity[];

  @OneToMany(() => FloodZoneEntity, (entity) => entity.adminUnit)
  floodZones: FloodZoneEntity[];

  @OneToMany(() => InfrastructureLayerEntity, (entity) => entity.adminUnit)
  infrastructureLayers: InfrastructureLayerEntity[];
}
