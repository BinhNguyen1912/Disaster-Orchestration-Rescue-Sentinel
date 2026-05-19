import { Entity, PrimaryGeneratedColumn, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { ProvinceEntity } from './province.entity';
import { DisasterEventEntity } from './disaster-event.entity';
import { UserEntity } from './user.entity';
import { CampaignStatus } from '@domain/enums/campaignStatus.enum';

@Entity('donation_campaign')
export class DonationCampaignEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  provinceId: number;

  @Column({ type: 'int', nullable: true })
  disasterEventId?: number;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'varchar', nullable: true })
  description?: string;

  @Column({ type: 'bigint', nullable: true })
  targetAmountVnd?: bigint;

  @Column({ type: 'bigint' })
  currentAmountVnd: bigint;

  @Column({ type: 'enum', enum: CampaignStatus })
  status: CampaignStatus;

  @Column({ type: 'varchar', nullable: true })
  bankAccountNumber?: string;

  @Column({ type: 'varchar', nullable: true })
  bankName?: string;

  @Column({ type: 'varchar', nullable: true })
  bankAccountName?: string;

  @Column({ type: 'varchar', nullable: true })
  qrCodeUrl?: string;

  @Column({ type: 'timestamp' })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  endedAt?: Date;

  @Column({ type: 'int', nullable: true })
  createdBy?: number;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'boolean' })
  isPublic: boolean;

  @ManyToOne(() => ProvinceEntity)
  @JoinColumn({ name: 'provinceId' })
  province: ProvinceEntity;

  @ManyToOne(() => DisasterEventEntity)
  @JoinColumn({ name: 'disasterEventId' })
  event?: DisasterEventEntity | null;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'createdBy' })
  creator?: UserEntity | null;

}
