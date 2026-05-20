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
import { RescueTeamEntity } from './rescue-team.entity';
import { UserEntity } from './user.entity';
import { ProvinceEntity } from './province.entity';
import { AdministrativeUnitEntity } from './administrative-unit.entity';
import { DutyStatus } from '@domain/enums/dutyStatus.enum';

@Entity('duty_log')
export class DutyLogEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  teamId: number;

  @Column({ type: 'int' })
  userId: number;

  @Column({ type: 'int' })
  provinceId: number;

  @Column({ type: 'int' })
  adminUnitId: number;

  @Column({ type: 'timestamp' })
  dutyStart: Date;

  @Column({ type: 'timestamp', nullable: true })
  dutyEnd?: Date;

  @Column({ type: 'enum', enum: DutyStatus })
  status: DutyStatus;

  @Column({ type: 'int' })
  sosReceived: number;

  @Column({ type: 'int' })
  sosResolved: number;

  @Column({ type: 'int' })
  rescuedCount: number;

  @Column({ type: 'varchar', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => RescueTeamEntity)
  @JoinColumn({ name: 'teamId' })
  team: RescueTeamEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @ManyToOne(() => ProvinceEntity)
  @JoinColumn({ name: 'provinceId' })
  province: ProvinceEntity;

  @ManyToOne(() => AdministrativeUnitEntity)
  @JoinColumn({ name: 'adminUnitId' })
  adminUnit: AdministrativeUnitEntity;
}
