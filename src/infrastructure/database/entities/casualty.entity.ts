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
import { SosRequestEntity } from './sos-request.entity';
import { RescueTeamEntity } from './rescue-team.entity';
import { UserEntity } from './user.entity';
import { CasualtyStatus } from '@domain/enums/casualtyStatus.enum';
import { Gender } from '@domain/enums/gender.enum';
import { IncidentCause } from '@domain/enums/incidentCause.enum';

@Entity('casualty')
export class CasualtyEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  provinceId: number;

  @Column({ type: 'int' })
  adminUnitId: number;

  @Column({ type: 'int', nullable: true })
  sosRequestId?: number;

  @Column({ type: 'int', nullable: true })
  rescueTeamId?: number;

  @Column({ type: 'int', nullable: true })
  reporterId?: number;

  @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326 })
  location: any; // geometry;

  @Column({ type: 'timestamp', nullable: true })
  incidentAt?: Date;

  @Column({ type: 'enum', enum: CasualtyStatus })
  status: CasualtyStatus;

  @Column({ type: 'varchar', nullable: true })
  victimName?: string;

  @Column({ type: 'varchar', nullable: true })
  victimNationalId?: string;

  @Column({ type: 'int', nullable: true })
  victimAge?: number;

  @Column({ type: 'enum', enum: Gender, nullable: true })
  victimGender?: Gender | null;

  @Column({ type: 'varchar', nullable: true })
  victimAddress?: string;

  @Column({ type: 'int', nullable: true })
  victimUserId?: number;

  @Column({ type: 'varchar', nullable: true })
  injuryDescription?: string;

  @Column({ type: 'enum', enum: IncidentCause })
  cause: IncidentCause;

  @Column({ type: 'varchar', nullable: true })
  hospitalTransferredTo?: string;

  @Column({ type: 'varchar', nullable: true })
  notes?: string;

  @Column({ type: 'varchar', array: true })
  imageUrls: string;

  @Column({ type: 'boolean' })
  isConfirmed: boolean;

  @Column({ type: 'int', nullable: true })
  confirmedBy?: number;

  @Column({ type: 'timestamp', nullable: true })
  confirmedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'int', nullable: true })
  createdBy?: number;

  @Column({ type: 'int', nullable: true })
  updatedBy?: number;

  @ManyToOne(() => ProvinceEntity)
  @JoinColumn({ name: 'provinceId' })
  province: ProvinceEntity;

  @ManyToOne(() => AdministrativeUnitEntity)
  @JoinColumn({ name: 'adminUnitId' })
  adminUnit: AdministrativeUnitEntity;

  @ManyToOne(() => SosRequestEntity)
  @JoinColumn({ name: 'sosRequestId' })
  sosRequest?: SosRequestEntity | null;

  @ManyToOne(() => RescueTeamEntity)
  @JoinColumn({ name: 'rescueTeamId' })
  rescueTeam?: RescueTeamEntity | null;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'reporterId' })
  reporter?: UserEntity | null;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'confirmedBy' })
  confirmer?: UserEntity | null;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'victimUserId' })
  victim?: UserEntity | null;
}
