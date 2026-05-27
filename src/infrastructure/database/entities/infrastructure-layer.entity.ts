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
import { InfraType } from '@shared/core/enums/infraType.enum';
import { InfraStatus } from '@shared/core/enums/infraStatus.enum';

@Entity('infrastructure_layer')
export class InfrastructureLayerEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  provinceId: number;

  @Column({ type: 'int' })
  adminUnitId: number;

  @Column({ type: 'enum', enum: InfraType })
  type: InfraType;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'geometry', spatialFeatureType: 'Geometry', srid: 4326 })
  location: any; // geometry;

  @Column({ type: 'enum', enum: InfraStatus })
  status: InfraStatus;

  @Column({ type: 'timestamp', nullable: true })
  lastDredgedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastFloodedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastMaintainedAt?: Date;

  @Column({ type: 'varchar', nullable: true })
  notes?: string;

  @Column({ type: 'int', nullable: true })
  updatedBy?: number;

  @CreateDateColumn()
  createdAt: Date;

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
