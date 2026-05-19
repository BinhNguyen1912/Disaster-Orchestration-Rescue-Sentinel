import { Entity, PrimaryGeneratedColumn, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { ProvinceEntity } from './province.entity';
import { UserEntity } from './user.entity';
import { SosRequestEntity } from './sos-request.entity';

@Entity('iot_device')
export class IotDeviceEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  provinceId: number;

  @Column({ type: 'varchar', unique: true })
  serialNumber: string;

  @Column({ type: 'int', nullable: true })
  ownerId?: number;

  @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326, nullable: true })
  lastLocation?: any // geometry;

  @Column({ type: 'timestamp', nullable: true })
  lastSeenAt?: Date;

  @Column({ type: 'int', nullable: true })
  batteryLevel?: number;

  @Column({ type: 'varchar', nullable: true })
  simPhoneNumber?: string;

  @Column({ type: 'boolean' })
  isActive: boolean;

  @Column({ type: 'varchar', nullable: true })
  firmwareVersion?: string;

  @ManyToOne(() => ProvinceEntity)
  @JoinColumn({ name: 'provinceId' })
  province: ProvinceEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'ownerId' })
  owner?: UserEntity | null;

  @OneToMany(() => SosRequestEntity, (entity) => entity.iotDevice)
  sosRequests: SosRequestEntity[];

}
