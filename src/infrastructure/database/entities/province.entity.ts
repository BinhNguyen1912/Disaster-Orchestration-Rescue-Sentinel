import { Entity, PrimaryGeneratedColumn, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { AdministrativeUnitEntity } from './administrative-unit.entity';
import { UserEntity } from './user.entity';
import { RoleEntity } from './role.entity';
import { UserRoleEntity } from './user-role.entity';
import { HouseholdProfileEntity } from './household-profile.entity';
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
import { FloodZoneEntity } from './flood-zone.entity';
import { InfrastructureLayerEntity } from './infrastructure-layer.entity';
import { WeatherAlertEntity } from './weather-alert.entity';
import { IotDeviceEntity } from './iot-device.entity';
import { AuditLogEntity } from './audit-log.entity';

@Entity('province')
export class ProvinceEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', unique: true })
  code: number;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  shortName?: string;

  @Column({ type: 'geometry', spatialFeatureType: 'MultiPolygon', srid: 4326, nullable: true })
  boundary?: any // geometry;

  @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326, nullable: true })
  centerPoint?: any // geometry;

  @Column({ type: 'boolean' })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  onboardedAt?: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: any;

  @OneToMany(() => AdministrativeUnitEntity, (entity) => entity.province)
  administrativeUnits: AdministrativeUnitEntity[];

  @OneToMany(() => UserEntity, (entity) => entity.province)
  users: UserEntity[];

  @OneToMany(() => RoleEntity, (entity) => entity.province)
  roles: RoleEntity[];

  @OneToMany(() => UserRoleEntity, (entity) => entity.province)
  userRoles: UserRoleEntity[];

  @OneToMany(() => HouseholdProfileEntity, (entity) => entity.province)
  householdProfiles: HouseholdProfileEntity[];

  @OneToMany(() => RescueTeamEntity, (entity) => entity.province)
  rescueTeams: RescueTeamEntity[];

  @OneToMany(() => DutyLogEntity, (entity) => entity.province)
  dutyLogs: DutyLogEntity[];

  @OneToMany(() => TeamAchievementEntity, (entity) => entity.province)
  teamAchievements: TeamAchievementEntity[];

  @OneToMany(() => SosRequestEntity, (entity) => entity.province)
  sosRequests: SosRequestEntity[];

  @OneToMany(() => FloodReportEntity, (entity) => entity.province)
  floodReports: FloodReportEntity[];

  @OneToMany(() => CasualtyEntity, (entity) => entity.province)
  casualties: CasualtyEntity[];

  @OneToMany(() => DisasterEventEntity, (entity) => entity.province)
  disasterEvents: DisasterEventEntity[];

  @OneToMany(() => DonationEntity, (entity) => entity.province)
  donations: DonationEntity[];

  @OneToMany(() => DonationCampaignEntity, (entity) => entity.province)
  donationCampaigns: DonationCampaignEntity[];

  @OneToMany(() => MessageEntity, (entity) => entity.province)
  messages: MessageEntity[];

  @OneToMany(() => FloodZoneEntity, (entity) => entity.province)
  floodZones: FloodZoneEntity[];

  @OneToMany(() => InfrastructureLayerEntity, (entity) => entity.province)
  infrastructureLayers: InfrastructureLayerEntity[];

  @OneToMany(() => WeatherAlertEntity, (entity) => entity.province)
  weatherAlerts: WeatherAlertEntity[];

  @OneToMany(() => IotDeviceEntity, (entity) => entity.province)
  iotDevices: IotDeviceEntity[];

  @OneToMany(() => AuditLogEntity, (entity) => entity.province)
  auditLogs: AuditLogEntity[];

}
