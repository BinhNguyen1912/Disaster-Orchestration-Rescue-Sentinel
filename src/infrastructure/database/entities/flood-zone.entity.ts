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
import { FloodFrequency } from '@shared/core/enums/floodFrequency.enum';
import { FloodReason } from '@shared/core/enums/floodReason.enum';

@Entity('flood_zone')
export class FloodZoneEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  provinceId: number;

  @Column({ type: 'int' })
  adminUnitId: number;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'geometry', spatialFeatureType: 'Polygon', srid: 4326 })
  boundary: any; // geometry;

  @Column({ type: 'int' })
  severityLevel: number;

  @Column({ type: 'enum', enum: FloodFrequency })
  floodFrequency: FloodFrequency;

  @Column({ type: 'int', nullable: true })
  avgDepthCm?: number;

  @Column({ type: 'timestamp', nullable: true })
  lastFloodedAt?: Date;

  @Column({ type: 'enum', enum: FloodReason, nullable: true })
  floodReason?: FloodReason | null;

  @Column({ type: 'varchar', nullable: true })
  notes?: string;

  @UpdateDateColumn()
  lastUpdated: Date;

  @Column({ type: 'int', nullable: true })
  updatedBy?: number;

  @ManyToOne(() => ProvinceEntity)
  @JoinColumn({ name: 'provinceId' })
  province: ProvinceEntity;

  @ManyToOne(() => AdministrativeUnitEntity)
  @JoinColumn({ name: 'adminUnitId' })
  adminUnit: AdministrativeUnitEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'updatedBy' })
  updater?: UserEntity | null;
}
