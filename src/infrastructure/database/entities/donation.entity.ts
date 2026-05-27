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
import { DisasterEventEntity } from './disaster-event.entity';
import { UserEntity } from './user.entity';
import { DonorType } from '@shared/core/enums/donorType.enum';
import { DonationType } from '@shared/core/enums/donationType.enum';
import { DonationStatus } from '@shared/core/enums/donationStatus.enum';

@Entity('donation')
export class DonationEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  provinceId: number;

  @Column({ type: 'int', nullable: true })
  disasterEventId?: number;

  @Column({ type: 'varchar', nullable: true })
  donorName?: string;

  @Column({ type: 'varchar', nullable: true })
  donorPhone?: string;

  @Column({ type: 'varchar', nullable: true })
  donorEmail?: string;

  @Column({ type: 'int', nullable: true })
  donorUserId?: number;

  @Column({ type: 'enum', enum: DonorType })
  donorType: DonorType;

  @Column({ type: 'boolean' })
  isAnonymous: boolean;

  @Column({ type: 'enum', enum: DonationType })
  donationType: DonationType;

  @Column({ type: 'bigint', nullable: true })
  amountVnd?: bigint;

  @Column({ type: 'varchar', nullable: true })
  goodsDescription?: string;

  @Column({ type: 'varchar', nullable: true })
  goodsQuantity?: string;

  @Column({ type: 'enum', enum: DonationStatus })
  status: DonationStatus;

  @Column({ type: 'timestamp', nullable: true })
  receivedAt?: Date;

  @Column({ type: 'int', nullable: true })
  receivedBy?: number;

  @Column({ type: 'varchar', nullable: true })
  receiptImageUrl?: string;

  @Column({ type: 'timestamp', nullable: true })
  distributedAt?: Date;

  @Column({ type: 'int', nullable: true })
  distributedBy?: number;

  @Column({ type: 'varchar', nullable: true })
  distributionNotes?: string;

  @Column({ type: 'varchar', nullable: true })
  distributionImageUrl?: string;

  @Column({ type: 'boolean' })
  isPublic: boolean;

  @Column({ type: 'varchar', nullable: true })
  message?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => ProvinceEntity)
  @JoinColumn({ name: 'provinceId' })
  province: ProvinceEntity;

  @ManyToOne(() => DisasterEventEntity)
  @JoinColumn({ name: 'disasterEventId' })
  event?: DisasterEventEntity | null;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'donorUserId' })
  donor?: UserEntity | null;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'receivedBy' })
  receiver?: UserEntity | null;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'distributedBy' })
  distributor?: UserEntity | null;
}
