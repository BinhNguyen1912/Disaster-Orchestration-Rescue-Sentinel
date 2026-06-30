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
  Unique,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { ProvinceEntity } from './province.entity';
import { AdministrativeUnitEntity } from './administrative-unit.entity';
import { UserRoleEntity } from './user-role.entity';
import { RoleEntity } from './role.entity';
import { HouseholdProfileEntity } from './household-profile.entity';
import { RescueTeamMemberEntity } from './rescue-team-member.entity';
import { RescueTeamEntity } from './rescue-team.entity';
import { DutyLogEntity } from './duty-log.entity';
import { TeamAchievementEntity } from './team-achievement.entity';
import { SosRequestEntity } from './sos-request.entity';
import { FloodReportEntity } from './flood-report.entity';
import { CasualtyEntity } from './casualty.entity';
import { DisasterEventEntity } from './disaster-event.entity';
import { DonationEntity } from './donation.entity';
import { DonationCampaignEntity } from './donation-campaign.entity';
import { MessageEntity } from './message.entity';
import { MessageReadEntity } from './message-read.entity';
import { FloodZoneEntity } from './flood-zone.entity';
import { InfrastructureLayerEntity } from './infrastructure-layer.entity';
import { WeatherAlertEntity } from './weather-alert.entity';
import { IotDeviceEntity } from './iot-device.entity';
import { AuditLogEntity } from './audit-log.entity';
import { DeviceEntity } from './device.entity';
import { PermissionEntity } from './permission.entity';
import { Gender } from '@shared/core/enums/gender.enum';

@Entity('user')
@Unique('UQ_USER_PHONE_PROVINCE', ['phone', 'provinceId'])
@Unique('UQ_USER_EMAIL_PROVINCE', ['email', 'provinceId'])
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  provinceId: number;

  @Column({ type: 'int', nullable: true })
  adminUnitId?: number;

  @Column({ type: 'varchar' })
  fullName: string;

  @Column({ type: 'varchar', unique: true })
  nationalId: string;

  @Column({ type: 'boolean', default: true })
  nationalIdVerified: boolean;

  @Column({ type: 'timestamp' })
  dateOfBirth: Date;

  @Column({ type: 'enum', enum: Gender })
  gender: Gender;

  @Column({ type: 'varchar' })
  phone: string;

  @Column({ type: 'boolean', default: true })
  phoneVerified: boolean;

  @Column({ type: 'varchar', nullable: true })
  email?: string;

  @Column({ type: 'boolean', default: true })
  emailVerified: boolean;

  @Column({ type: 'varchar', nullable: true })
  @Exclude()
  password?: string;

  @Column({ type: 'varchar', nullable: true })
  avatarUrl?: string;

  @Column({ type: 'varchar', nullable: true })
  nationalIdFrontUrl?: string;

  @Column({ type: 'varchar', nullable: true })
  nationalIdBackUrl?: string;

  @Column({ type: 'varchar', nullable: true })
  addressDetail?: string;

  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  homeLocation?: any; // geometry;

  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  currentLocation?: any; // geometry;

  @Column({ type: 'float', default: 50 }) //CHECK LATER?
  trustScore: number;

  @Column({ type: 'boolean', default: false })
  isVerified: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isVolunteer: boolean;

  @Column({ type: 'boolean', default: false })
  needsHelp: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt?: Date;

  // Các trường hỗ trợ tính năng quên mật khẩu (lưu tạm, xóa sau khi dùng)
  @Column({ type: 'varchar', nullable: true })
  @Exclude()
  passwordResetOtp?: string;

  @Column({ type: 'timestamp', nullable: true })
  @Exclude()
  passwordResetOtpExpires?: Date;

  @Column({ type: 'varchar', nullable: true })
  @Exclude()
  passwordResetToken?: string;

  @ManyToOne(() => ProvinceEntity)
  @JoinColumn({ name: 'provinceId' })
  province: ProvinceEntity;

  @ManyToOne(() => AdministrativeUnitEntity)
  @JoinColumn({ name: 'adminUnitId' })
  adminUnit?: AdministrativeUnitEntity | null;

  @OneToMany(() => UserRoleEntity, (entity) => entity.user)
  userRoles: UserRoleEntity[];

  @OneToMany(() => RoleEntity, (entity) => entity.creator)
  rolesCreated: RoleEntity[];

  @ManyToOne(() => HouseholdProfileEntity)
  householdProfile?: HouseholdProfileEntity | null;

  @ManyToOne(() => RescueTeamMemberEntity)
  rescueTeamMember?: RescueTeamMemberEntity | null;

  @OneToMany(() => RescueTeamEntity, (entity) => entity.leader)
  leaderOfTeams: RescueTeamEntity[];

  @OneToMany(() => DutyLogEntity, (entity) => entity.user)
  dutyLogs: DutyLogEntity[];

  @OneToMany(() => TeamAchievementEntity, (entity) => entity.awarder)
  achievementsAwarded: TeamAchievementEntity[];

  @OneToMany(() => SosRequestEntity, (entity) => entity.user)
  sosRequests: SosRequestEntity[];

  @OneToMany(() => SosRequestEntity, (entity) => entity.assigner)
  sosAssigned: SosRequestEntity[];

  @OneToMany(() => SosRequestEntity, (entity) => entity.resolver)
  sosResolved: SosRequestEntity[];

  @OneToMany(() => FloodReportEntity, (entity) => entity.reporter)
  floodReports: FloodReportEntity[];

  @OneToMany(() => FloodReportEntity, (entity) => entity.verifier)
  floodVerified: FloodReportEntity[];

  @OneToMany(() => CasualtyEntity, (entity) => entity.reporter)
  casualtiesReported: CasualtyEntity[];

  @OneToMany(() => CasualtyEntity, (entity) => entity.confirmer)
  casualtiesConfirmed: CasualtyEntity[];

  @OneToMany(() => CasualtyEntity, (entity) => entity.victim)
  casualtiesVictim: CasualtyEntity[];

  @OneToMany(() => DisasterEventEntity, (entity) => entity.creator)
  disasterEventsCreated: DisasterEventEntity[];

  @OneToMany(() => DonationEntity, (entity) => entity.donor)
  donations: DonationEntity[];

  @OneToMany(() => DonationEntity, (entity) => entity.receiver)
  donationsReceived: DonationEntity[];

  @OneToMany(() => DonationEntity, (entity) => entity.distributor)
  donationsDistributed: DonationEntity[];

  @OneToMany(() => DonationCampaignEntity, (entity) => entity.creator)
  campaignsCreated: DonationCampaignEntity[];

  @OneToMany(() => MessageEntity, (entity) => entity.sender)
  messagesSent: MessageEntity[];

  @OneToMany(() => MessageReadEntity, (entity) => entity.user)
  messageReads: MessageReadEntity[];

  @OneToMany(() => FloodZoneEntity, (entity) => entity.updater)
  floodZonesUpdated: FloodZoneEntity[];

  @OneToMany(() => InfrastructureLayerEntity, (entity) => entity.updater)
  infrastructureUpdated: InfrastructureLayerEntity[];

  @OneToMany(() => WeatherAlertEntity, (entity) => entity.triggerer)
  weatherAlertsTriggered: WeatherAlertEntity[];

  @OneToMany(() => IotDeviceEntity, (entity) => entity.owner)
  iotDevices: IotDeviceEntity[];

  @OneToMany(() => AuditLogEntity, (entity) => entity.user)
  auditLogs: AuditLogEntity[];

  @OneToMany(() => DeviceEntity, (entity) => entity.user)
  devices: DeviceEntity[];

  @OneToMany(() => PermissionEntity, (entity) => entity.creator)
  permissionsCreated: PermissionEntity[];

  @OneToMany(() => PermissionEntity, (entity) => entity.updater)
  permissionsUpdated: PermissionEntity[];
}
