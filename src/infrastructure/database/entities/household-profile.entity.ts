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
import { UserEntity } from './user.entity';
import { ProvinceEntity } from './province.entity';
import { AdministrativeUnitEntity } from './administrative-unit.entity';
import {
  AssetValueLevel,
  WaterUsageLevel,
} from '@shared/core/enums/level.enum';

@Entity('household_profile')
export class HouseholdProfileEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', unique: true })
  residentId: number;

  @Column({ type: 'int' })
  provinceId: number;

  @Column({ type: 'int' })
  adminUnitId: number;

  @Column({ type: 'varchar', nullable: true })
  addressDetail?: string;

  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  homeLocation?: any; // geometry;

  @Column({ type: 'int', nullable: true })
  floorCount?: number;

  @Column({ type: 'int' })
  totalMembers: number;

  @Column({ type: 'int' })
  elderlyCount: number;

  @Column({ type: 'int' })
  childrenCount: number;

  @Column({ type: 'int' })
  pregnantCount: number;

  @Column({ type: 'int' })
  disabledCount: number;

  @Column({ type: 'boolean' })
  hasChronicIllness: boolean;

  @Column({ type: 'varchar', nullable: true })
  healthNotes?: string;

  @Column({ type: 'enum', enum: AssetValueLevel, nullable: true })
  assetValueLevel?: AssetValueLevel | null;

  @Column({ type: 'varchar', nullable: true })
  businessType?: string;

  @Column({ type: 'enum', enum: WaterUsageLevel, nullable: true })
  waterUsageLevel?: WaterUsageLevel | null;

  @Column({ type: 'varchar', nullable: true })
  productionType?: string;

  @Column({ type: 'boolean' })
  nearManhole: boolean;

  @Column({ type: 'boolean' })
  nearWasteSite: boolean;

  @Column({ type: 'boolean' })
  nearProduction: boolean;

  @Column({ type: 'boolean' })
  nearCanal: boolean;

  @Column({ type: 'varchar', nullable: true })
  envNotes?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'int', nullable: true })
  updatedBy?: number;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'residentId' })
  resident: UserEntity;

  @ManyToOne(() => ProvinceEntity)
  @JoinColumn({ name: 'provinceId' })
  province: ProvinceEntity;

  @ManyToOne(() => AdministrativeUnitEntity)
  @JoinColumn({ name: 'adminUnitId' })
  adminUnit: AdministrativeUnitEntity;
}
