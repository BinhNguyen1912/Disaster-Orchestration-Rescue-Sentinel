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
import { AdministrativeUnitEntity } from './administrative-unit.entity';
import { UserEntity } from './user.entity';
import { IotDeviceEntity } from './iot-device.entity';
import { RescueTeamEntity } from './rescue-team.entity';
import { CasualtyEntity } from './casualty.entity';
import { SosStatus } from '@shared/core/enums/sosStatus.enum';
import { Severity } from '@shared/core/enums/level.enum';
import { SosSource } from '@shared/core/enums/sosSource.enum';
import { DispatchMethod } from '@shared/core/enums/dispatchMethod.enum';
import { SosRequestType } from '@shared/index';

@Entity('sos_request')
export class SosRequestEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  provinceId: number;

  @Column({ type: 'int' })
  adminUnitId: number;

  @Column({ type: 'int', nullable: true })
  requesterId?: number | null;

  @Column({ type: 'varchar', nullable: true })
  requesterName?: string | null;

  @Column({ type: 'varchar', nullable: true })
  requesterPhone?: string | null;

  @Column({ type: 'int', nullable: true })
  deviceId?: number;

  @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326 })
  location: any; // geometry;

  @Column({ type: 'enum', enum: SosRequestType })
  requestType: SosRequestType;

  @Column({ type: 'enum', enum: SosStatus })
  status: SosStatus;

  @Column({ type: 'enum', enum: Severity })
  severity: Severity;

  @Column({ type: 'int', default: 1 })
  trappedPeopleCount: number;

  @Column({ type: 'varchar', array: true, nullable: true })
  specialNeedsTags?: string[] | null;

  @Column({ type: 'varchar', array: true })
  imageUrls: string[];

  @Column({ type: 'varchar', nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: SosSource })
  source: SosSource;

  @Column({ type: 'int', nullable: true })
  assignedTeamId?: number;

  @Column({ type: 'int', nullable: true })
  assignedBy?: number;

  @Column({ type: 'timestamp', nullable: true })
  assignedAt?: Date;

  @Column({ type: 'enum', enum: DispatchMethod, nullable: true })
  dispatchMethod?: DispatchMethod | null;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt?: Date;

  @Column({ type: 'int', nullable: true })
  resolvedBy?: number;

  @Column({ type: 'varchar', nullable: true })
  resolutionNotes?: string;

  @Column({ type: 'int', nullable: true })
  clusterId?: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => ProvinceEntity)
  @JoinColumn({ name: 'provinceId' })
  province: ProvinceEntity;

  @ManyToOne(() => AdministrativeUnitEntity)
  @JoinColumn({ name: 'adminUnitId' })
  adminUnit: AdministrativeUnitEntity;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'requesterId' })
  user?: UserEntity | null;

  @ManyToOne(() => IotDeviceEntity)
  @JoinColumn({ name: 'deviceId' })
  iotDevice?: IotDeviceEntity | null;

  @ManyToOne(() => RescueTeamEntity)
  @JoinColumn({ name: 'assignedTeamId' })
  assignedTeam?: RescueTeamEntity | null;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'assignedBy' })
  assigner?: UserEntity | null;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'resolvedBy' })
  resolver?: UserEntity | null;

  @OneToMany(() => CasualtyEntity, (entity) => entity.sosRequest)
  casualties: CasualtyEntity[];
}
