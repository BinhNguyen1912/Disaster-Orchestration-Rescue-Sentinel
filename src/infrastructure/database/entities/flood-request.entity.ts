import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { ProvinceEntity } from './province.entity';
import { AdministrativeUnitEntity } from './administrative-unit.entity';
import { UserEntity } from './user.entity';
import { SosRequestEntity } from './sos-request.entity';
import { Severity } from '@shared/core/enums/level.enum';
import { FloodRequestPurpose } from '@shared/core/enums/floodRequestPurpose.enum';
import { FloodRequestStatus } from '@shared/core/enums/floodRequestStatus.enum';
import { DispatchMethod } from '@shared/core/enums/dispatchMethod.enum';
import { SosSource } from '@shared/core/enums/sosSource.enum';
import { FloodRequestStatusHistoryEntity } from './flood-request-status-history.entity';

@Entity('flood_request')
export class FloodRequestEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'int', name: 'requester_id', nullable: true })
  requesterId?: number | null;

  @Column({ type: 'varchar', name: 'requester_name', length: 100 })
  requesterName: string;

  @Column({ type: 'varchar', name: 'requester_phone', length: 20 })
  requesterPhone: string;

  @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326 })
  location: any;

  @Column({ type: 'int', name: 'province_id' })
  provinceId: number;

  @Column({ type: 'int', name: 'admin_unit_id' })
  adminUnitId: number;

  @Column({ type: 'varchar', name: 'location_name', length: 255, nullable: true })
  locationName?: string;

  @Column({ type: 'text', name: 'address_detail', nullable: true })
  addressDetail?: string;

  @Column({ type: 'enum', enum: Severity })
  severity: Severity;

  @Column({ type: 'int', name: 'flood_depth_cm_min', nullable: true })
  floodDepthCmMin?: number;

  @Column({ type: 'int', name: 'flood_depth_cm_max', nullable: true })
  floodDepthCmMax?: number;

  @Column({ type: 'decimal', name: 'estimated_area_ha', precision: 10, scale: 2, nullable: true })
  estimatedAreaHa?: number;

  @Column({ type: 'varchar', name: 'road_type', length: 100, nullable: true })
  roadType?: string;

  @Column({ type: 'varchar', name: 'impact', length: 255, nullable: true })
  impact?: string;

  @Column({ type: 'varchar', name: 'weather', length: 100, nullable: true })
  weather?: string;

  @Column({ type: 'text', name: 'notes', nullable: true })
  notes?: string;

  @Column({ type: 'varchar', name: 'image_urls', array: true, default: [] })
  imageUrls: string[];

  @Column({ type: 'enum', enum: FloodRequestPurpose })
  purpose: FloodRequestPurpose;

  @Column({ type: 'enum', enum: FloodRequestStatus, default: FloodRequestStatus.PENDING })
  status: FloodRequestStatus;

  @Column({ type: 'boolean', name: 'is_approved_for_map', default: false })
  isApprovedForMap: boolean;

  @Column({ type: 'int', name: 'reviewed_by', nullable: true })
  reviewedBy?: number | null;

  @Column({ type: 'timestamp', name: 'reviewed_at', nullable: true })
  reviewedAt?: Date | null;

  @Column({ type: 'text', name: 'review_notes', nullable: true })
  reviewNotes?: string;

  @Column({ type: 'int', name: 'linked_sos_id', nullable: true })
  linkedSosId?: number | null;

  @Column({ type: 'enum', name: 'dispatch_method', enum: DispatchMethod, nullable: true })
  dispatchMethod?: DispatchMethod | null;

  @Column({ type: 'enum', enum: SosSource, default: SosSource.APP })
  source: SosSource;

  @Column({ type: 'varchar', name: 'device_info', length: 200, nullable: true })
  deviceInfo?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => ProvinceEntity)
  @JoinColumn({ name: 'province_id' })
  province?: ProvinceEntity;

  @ManyToOne(() => AdministrativeUnitEntity)
  @JoinColumn({ name: 'admin_unit_id' })
  adminUnit?: AdministrativeUnitEntity;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'requester_id' })
  requester?: UserEntity | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer?: UserEntity | null;

  @ManyToOne(() => SosRequestEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'linked_sos_id' })
  linkedSos?: SosRequestEntity | null;

  @OneToMany(() => FloodRequestStatusHistoryEntity, (h) => h.floodRequest)
  statusHistory: FloodRequestStatusHistoryEntity[];
}
