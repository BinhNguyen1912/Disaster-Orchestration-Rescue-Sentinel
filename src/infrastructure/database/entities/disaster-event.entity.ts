import { Entity, PrimaryGeneratedColumn, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { ProvinceEntity } from './province.entity';
import { UserEntity } from './user.entity';
import { DonationEntity } from './donation.entity';
import { DonationCampaignEntity } from './donation-campaign.entity';
import { DisasterEventType } from '@domain/enums/disasterEventType.enum';
import { EventStatus } from '@domain/enums/eventStatus.enum';

@Entity('disaster_event')
export class DisasterEventEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  provinceId: number;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'enum', enum: DisasterEventType })
  eventType: DisasterEventType;

  @Column({ type: 'timestamp' })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  endedAt?: Date;

  @Column({ type: 'geometry', spatialFeatureType: 'MultiPolygon', srid: 4326, nullable: true })
  affectedArea?: any // geometry;

  @Column({ type: 'int' })
  totalDeceased: number;

  @Column({ type: 'int' })
  totalInjured: number;

  @Column({ type: 'int' })
  totalMissing: number;

  @Column({ type: 'int' })
  totalSafe: number;

  @Column({ type: 'int' })
  totalEvacuated: number;

  @Column({ type: 'bigint', nullable: true })
  estimatedDamageVnd?: bigint;

  @Column({ type: 'int' })
  housesDamaged: number;

  @Column({ type: 'int' })
  housesDestroyed: number;

  @Column({ type: 'float' })
  cropsDamageHa: number;

  @Column({ type: 'enum', enum: EventStatus })
  status: EventStatus;

  @Column({ type: 'int', nullable: true })
  createdBy?: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => ProvinceEntity)
  @JoinColumn({ name: 'provinceId' })
  province: ProvinceEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'createdBy' })
  creator?: UserEntity | null;

  @OneToMany(() => DonationEntity, (entity) => entity.event)
  donations: DonationEntity[];

  @OneToMany(() => DonationCampaignEntity, (entity) => entity.event)
  campaigns: DonationCampaignEntity[];

}
