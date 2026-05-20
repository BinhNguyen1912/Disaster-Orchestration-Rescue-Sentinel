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
import { FloodReportType } from '@domain/enums/floodReportType.enum';
import { ReportStatus } from '@domain/enums/reportStatus.enum';

@Entity('flood_report')
export class FloodReportEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  provinceId: number;

  @Column({ type: 'int' })
  adminUnitId: number;

  @Column({ type: 'int' })
  reporterId: number;

  @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326 })
  location: any; // geometry;

  @Column({ type: 'enum', enum: FloodReportType })
  reportType: FloodReportType;

  @Column({ type: 'int', nullable: true })
  waterDepthCm?: number;

  @Column({ type: 'varchar', array: true })
  imageUrls: string;

  @Column({ type: 'varchar', nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: ReportStatus })
  status: ReportStatus;

  @Column({ type: 'int', nullable: true })
  verifiedBy?: number;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt?: Date;

  @Column({ type: 'int' })
  confirmationCount: number;

  @Column({ type: 'boolean' })
  isCommunityAlert: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => ProvinceEntity)
  @JoinColumn({ name: 'provinceId' })
  province: ProvinceEntity;

  @ManyToOne(() => AdministrativeUnitEntity)
  @JoinColumn({ name: 'adminUnitId' })
  adminUnit: AdministrativeUnitEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'reporterId' })
  reporter: UserEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'verifiedBy' })
  verifier?: UserEntity | null;
}
