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
import { WeatherSource } from '@shared/core/enums/weatherSource.enum';
import { WeatherAlertType } from '@shared/core/enums/weatherAlertType.enum';

@Entity('weather_alert')
export class WeatherAlertEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  provinceId: number;

  @Column({ type: 'enum', enum: WeatherSource })
  source: WeatherSource;

  @Column({ type: 'enum', enum: WeatherAlertType })
  alertType: WeatherAlertType;

  @Column({
    type: 'geometry',
    spatialFeatureType: 'Polygon',
    srid: 4326,
    nullable: true,
  })
  area?: any; // geometry;

  @Column({ type: 'int' })
  severityLevel: number;

  @Column({ type: 'timestamp' })
  issuedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @Column({ type: 'jsonb', nullable: true })
  rawData?: any;

  @Column({ type: 'boolean' })
  isTriggeredIot: boolean;

  @Column({ type: 'int', nullable: true })
  triggeredBy?: number;

  @ManyToOne(() => ProvinceEntity)
  @JoinColumn({ name: 'provinceId' })
  province: ProvinceEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'triggeredBy' })
  triggerer?: UserEntity | null;
}
