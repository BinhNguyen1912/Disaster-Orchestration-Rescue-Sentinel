import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { IDashboardService } from '../interfaces/dashboard.service.interface';
import { HouseholdProfileEntity } from '@infrastructure/database/entities/household-profile.entity';
import { RescueTeamEntity } from '@infrastructure/database/entities/rescue-team.entity';
import { SosRequestEntity } from '@infrastructure/database/entities/sos-request.entity';
import { DisasterEventEntity } from '@infrastructure/database/entities/disaster-event.entity';
import { DonationEntity } from '@infrastructure/database/entities/donation.entity';
import { RescueEquipmentEntity } from '@infrastructure/database/entities/rescue-equipment.entity';
import { CasualtyEntity } from '@infrastructure/database/entities/casualty.entity';
import { UserEntity } from '@infrastructure/database/entities/user.entity';
import { SosStatus } from '@shared/core/enums/sosStatus.enum';
import { TeamStatus } from '@shared/core/enums/teamStatus.enum';
import { EventStatus } from '@shared/core/enums/eventStatus.enum';
import { DonationStatus } from '@shared/core/enums/donationStatus.enum';

@Injectable()
export class DashboardService implements IDashboardService {
  constructor(
    @InjectRepository(HouseholdProfileEntity)
    private readonly householdRepo: Repository<HouseholdProfileEntity>,
    @InjectRepository(RescueTeamEntity)
    private readonly rescueTeamRepo: Repository<RescueTeamEntity>,
    @InjectRepository(SosRequestEntity)
    private readonly sosRepo: Repository<SosRequestEntity>,
    @InjectRepository(DisasterEventEntity)
    private readonly disasterRepo: Repository<DisasterEventEntity>,
    @InjectRepository(DonationEntity)
    private readonly donationRepo: Repository<DonationEntity>,
    @InjectRepository(RescueEquipmentEntity)
    private readonly equipmentRepo: Repository<RescueEquipmentEntity>,
    @InjectRepository(CasualtyEntity)
    private readonly casualtyRepo: Repository<CasualtyEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  // 1. Stats tổng quan (Top cards)
  async getStats(
    provinceId: number | null,
    startDate?: Date,
    endDate?: Date,
    adminUnitId?: number,
  ): Promise<any> {
    // a. Hộ dân (Đếm các user có role là RESIDENT)
    let householdQuery = this.userRepo.createQueryBuilder('u')
      .innerJoin('user_role', 'ur', 'ur.userId = u.id')
      .innerJoin('role', 'r', 'ur.roleId = r.id')
      .where('r.name = :roleName', { roleName: 'RESIDENT' })
      .andWhere('ur.isActive = :isActive', { isActive: true });

    if (provinceId) {
      householdQuery.andWhere('ur.provinceId = :provinceId', { provinceId });
    }
    if (adminUnitId) {
      householdQuery.andWhere('u.adminUnitId = :adminUnitId', { adminUnitId });
    }
    const totalHouseholds = await householdQuery.getCount();

    // b. Đội cứu hộ
    let teamQuery = this.rescueTeamRepo.createQueryBuilder('rt')
      .where('rt.status != :status', { status: TeamStatus.OFF_DUTY });
    if (provinceId) {
      teamQuery.andWhere('rt.provinceId = :provinceId', { provinceId });
    }
    if (adminUnitId) {
      teamQuery.andWhere('rt.adminUnitId = :adminUnitId', { adminUnitId });
    }
    const activeRescueTeams = await teamQuery.getCount();

    // c. SOS đang hoạt động (Đếm tất cả SOS trong thời gian lọc, kể cả đã hoàn thành)
    let sosQuery = this.sosRepo.createQueryBuilder('sos')
      .where('1=1');
    if (provinceId) {
      sosQuery.andWhere('sos.provinceId = :provinceId', { provinceId });
    }
    if (adminUnitId) {
      sosQuery.andWhere('sos.adminUnitId = :adminUnitId', { adminUnitId });
    }
    if (startDate) {
      sosQuery.andWhere('sos.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      sosQuery.andWhere('sos.createdAt <= :endDate', { endDate: end });
    }
    const activeSosRequests = await sosQuery.getCount();

    // d. Thiên tai đang diễn ra
    let disasterQuery = this.disasterRepo.createQueryBuilder('de')
      .where('de.status = :status', { status: EventStatus.ONGOING });
    if (provinceId) {
      disasterQuery.andWhere('de.provinceId = :provinceId', { provinceId });
    }
    if (startDate) {
      disasterQuery.andWhere('de.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      disasterQuery.andWhere('de.createdAt <= :endDate', { endDate: end });
    }
    const ongoingDisasters = await disasterQuery.getCount();

    // e. Tổng quyên góp
    let donationQuery = this.donationRepo.createQueryBuilder('d')
      .select('SUM(d.amountVnd)', 'total')
      .where('d.status IN (:...statuses)', {
        statuses: [DonationStatus.RECEIVED, DonationStatus.DISTRIBUTED],
      });
    if (provinceId) {
      donationQuery.andWhere('d.provinceId = :provinceId', { provinceId });
    }
    if (startDate) {
      donationQuery.andWhere('d.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      donationQuery.andWhere('d.createdAt <= :endDate', { endDate: end });
    }
    const donationSum = await donationQuery.getRawOne();
    const totalDonations = donationSum?.total ? Number(donationSum.total) : 0;

    // Sparklines
    const baselineSparkline = [0, 0, 0, 0, 0, 0, 0];
    
    // Sparkline cho SOS theo date range
    const endRange = endDate || new Date();
    const startRange = startDate || (() => {
      const d = new Date(endRange);
      d.setDate(d.getDate() - 6);
      return d;
    })();
    const startStr = startRange.toISOString().split('T')[0];
    const endStr = endRange.toISOString().split('T')[0];

    const sqlParams = [startStr, endStr];
    let queryConditions = '';
    if (provinceId) {
      sqlParams.push(String(provinceId));
      queryConditions += ` AND s."provinceId" = $${sqlParams.length}`;
    }
    if (adminUnitId) {
      sqlParams.push(String(adminUnitId));
      queryConditions += ` AND s."adminUnitId" = $${sqlParams.length}`;
    }

    const sosSparkData = await this.sosRepo.query(`
      SELECT 
        d.date::date as date,
        COALESCE(COUNT(s.id), 0)::int as count
      FROM (
        SELECT GENERATE_SERIES($1::date, $2::date, '1 day')::date as date
      ) d
      LEFT JOIN sos_request s ON DATE(s."createdAt") = d.date ${queryConditions}
      GROUP BY d.date
      ORDER BY d.date ASC
    `, sqlParams);

    const activeSosRequestsSparkline = sosSparkData.map((pt, idx) => 
      pt.count > 0 ? pt.count : (sosSparkData.length === 7 ? baselineSparkline[idx] : 0)
    );

    return {
      totalHouseholds: {
        value: totalHouseholds,
        trend: 0,
        sparkline: [totalHouseholds, totalHouseholds, totalHouseholds, totalHouseholds, totalHouseholds, totalHouseholds, totalHouseholds],
      },
      activeRescueTeams: {
        value: activeRescueTeams,
        trend: 0,
        sparkline: [activeRescueTeams, activeRescueTeams, activeRescueTeams, activeRescueTeams, activeRescueTeams, activeRescueTeams, activeRescueTeams],
      },
      activeSosRequests: {
        value: activeSosRequests,
        trend: 0,
        sparkline: activeSosRequestsSparkline,
      },
      ongoingDisasters: {
        value: ongoingDisasters,
        trend: 0,
        sparkline: [ongoingDisasters, ongoingDisasters, ongoingDisasters, ongoingDisasters, ongoingDisasters, ongoingDisasters, ongoingDisasters],
      },
      totalDonations: {
        value: totalDonations,
        trend: 0,
        sparkline: [totalDonations, totalDonations, totalDonations, totalDonations, totalDonations, totalDonations, totalDonations],
      },
    };
  }

  // 2. Charts xu hướng SOS & kết quả
  async getCharts(
    provinceId: number | null,
    days?: number,
    startDate?: Date,
    endDate?: Date,
    adminUnitId?: number,
  ): Promise<any> {
    const end = endDate || new Date();
    const start = startDate || (() => {
      const d = new Date(end);
      const period = days && days > 0 ? days : 7;
      d.setDate(d.getDate() - (period - 1));
      return d;
    })();

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    const sqlParams = [startStr, endStr];
    let queryConditions = '';
    if (provinceId) {
      sqlParams.push(String(provinceId));
      queryConditions += ` AND s."provinceId" = $${sqlParams.length}`;
    }
    if (adminUnitId) {
      sqlParams.push(String(adminUnitId));
      queryConditions += ` AND s."adminUnitId" = $${sqlParams.length}`;
    }

    const dbSosOverTime = await this.sosRepo.query(`
      SELECT 
        TO_CHAR(d.date, 'DD/MM') as date,
        COALESCE(COUNT(s.id), 0)::int as total,
        COALESCE(COUNT(CASE WHEN s.status = 'RESOLVED' THEN 1 END), 0)::int as resolved,
        COALESCE(COUNT(CASE WHEN s.status IN ('PENDING', 'DISPATCHED', 'ON_SITE', 'PENDING_SPECIALIST') THEN 1 END), 0)::int as pending
      FROM (
        SELECT GENERATE_SERIES($1::date, $2::date, '1 day')::date as date
      ) d
      LEFT JOIN sos_request s ON DATE(s."createdAt") = d.date ${queryConditions}
      GROUP BY d.date
      ORDER BY d.date ASC
    `, sqlParams);

    const fallbackCharts = [
      { date: '26/05', total: 60, resolved: 45, pending: 15 },
      { date: '27/05', total: 55, resolved: 40, pending: 15 },
      { date: '28/05', total: 48, resolved: 35, pending: 13 },
      { date: '29/05', total: 70, resolved: 50, pending: 20 },
      { date: '30/05', total: 85, resolved: 65, pending: 20 },
      { date: '31/05', total: 110, resolved: 85, pending: 25 },
      { date: '01/06', total: 95, resolved: 70, pending: 25 },
    ];

    const sosOverTime = dbSosOverTime;

    // Tỷ lệ kết quả cứu hộ
    let outcomeQuery = this.sosRepo.createQueryBuilder('sos');
    if (provinceId) {
      outcomeQuery.where('sos.provinceId = :provinceId', { provinceId });
    }
    if (adminUnitId) {
      outcomeQuery.andWhere('sos.adminUnitId = :adminUnitId', { adminUnitId });
    }
    if (startDate) {
      outcomeQuery.andWhere('sos.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      const endVal = new Date(endDate);
      endVal.setHours(23, 59, 59, 999);
      outcomeQuery.andWhere('sos.createdAt <= :endDate', { endDate: endVal });
    }

    const resolvedCount = await outcomeQuery.clone()
      .andWhere('sos.status = :status', { status: SosStatus.RESOLVED })
      .getCount();

    const ongoingCount = await outcomeQuery.clone()
      .andWhere('sos.status IN (:...statuses)', { statuses: [SosStatus.DISPATCHED, SosStatus.ON_SITE] })
      .getCount();

    const pendingCount = await outcomeQuery.clone()
      .andWhere('sos.status = :status', { status: SosStatus.PENDING })
      .getCount();

    const totalOutcomes = resolvedCount + ongoingCount + pendingCount;

    // Tỉnh/Thành phố hoặc Quận/Huyện dựa trên provinceId
    const sqlParamsReg: any[] = [];
    let conditionsReg = '1=1';

    if (provinceId) {
      sqlParamsReg.push(provinceId);
      conditionsReg += ` AND s."provinceId" = $${sqlParamsReg.length}`;
    }
    if (adminUnitId) {
      sqlParamsReg.push(adminUnitId);
      conditionsReg += ` AND s."adminUnitId" = $${sqlParamsReg.length}`;
    }
    if (startDate) {
      sqlParamsReg.push(startDate);
      conditionsReg += ` AND s."createdAt" >= $${sqlParamsReg.length}`;
    }
    if (endDate) {
      const endVal = new Date(endDate);
      endVal.setHours(23, 59, 59, 999);
      sqlParamsReg.push(endVal);
      conditionsReg += ` AND s."createdAt" <= $${sqlParamsReg.length}`;
    }

    const regQuery = provinceId 
      ? `
        SELECT 
          au.name as region,
          COUNT(s.id)::int as count
        FROM (
          SELECT id, "provinceId", "adminUnitId", "createdAt"
          FROM sos_request
          UNION ALL
          SELECT id, province_id as "provinceId", admin_unit_id as "adminUnitId", created_at as "createdAt"
          FROM flood_request
          WHERE is_approved_for_map = true
        ) s
        INNER JOIN administrative_unit au ON s."adminUnitId" = au.id
        WHERE ${conditionsReg}
        GROUP BY au.id, au.name
        ORDER BY count DESC
        LIMIT 5
      `
      : `
        SELECT 
          p.name as region,
          COUNT(s.id)::int as count
        FROM (
          SELECT id, "provinceId", "adminUnitId", "createdAt"
          FROM sos_request
          UNION ALL
          SELECT id, province_id as "provinceId", admin_unit_id as "adminUnitId", created_at as "createdAt"
          FROM flood_request
          WHERE is_approved_for_map = true
        ) s
        INNER JOIN province p ON s."provinceId" = p.id
        WHERE ${conditionsReg}
        GROUP BY p.id, p.name
        ORDER BY count DESC
        LIMIT 5
      `;

    const dbSosByRegion = await this.sosRepo.query(regQuery, sqlParamsReg);

    const maxCount = dbSosByRegion.length > 0 ? Math.max(...dbSosByRegion.map((r: any) => r.count)) : 0;
    const sosByRegion = dbSosByRegion.map((r: any) => ({
      region: r.region,
      count: r.count,
      percent: maxCount > 0 ? Math.min(Math.round((r.count / maxCount) * 100), 100) : 0,
    }));

    return {
      sosOverTime,
      rescueOutcomes: {
        total: totalOutcomes,
        saved: resolvedCount,
        ongoing: ongoingCount,
        failed: pendingCount,
      },
      sosByRegion,
    };
  }

  // 3. Alerts khẩn cấp & SOS mới nhất
  async getAlerts(
    provinceId: number | null,
    startDate?: Date,
    endDate?: Date,
    adminUnitId?: number,
  ): Promise<any> {
    // 5 Thiên tai mới nhất
    let disasterQuery = this.disasterRepo.createQueryBuilder('de')
      .orderBy('de.createdAt', 'DESC')
      .limit(5);
    if (provinceId) {
      disasterQuery.where('de.provinceId = :provinceId', { provinceId });
    }
    if (startDate) {
      disasterQuery.andWhere('de.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      const endVal = new Date(endDate);
      endVal.setHours(23, 59, 59, 999);
      disasterQuery.andWhere('de.createdAt <= :endDate', { endDate: endVal });
    }
    const dbDisasters = await disasterQuery.getMany();

    const disasters = dbDisasters.map((d) => ({
      id: d.id,
      title: d.name,
      badge: d.status === EventStatus.ONGOING ? 'CẢNH BÁO' : 'LỊCH SỬ',
      badgeColor: d.status === EventStatus.ONGOING 
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' 
        : 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
      desc: `Thiệt hại sơ bộ: ${d.totalInjured} người bị thương, ${d.housesDamaged} ngôi nhà bị ảnh hưởng.`,
      time: 'Vừa cập nhật',
      statusDot: d.status === EventStatus.ONGOING ? 'bg-amber-500' : 'bg-slate-400',
    }));

    const fallbackDisasters = [
      {
        id: 1,
        title: 'Lũ quét tại Hòa Bình',
        badge: 'CẢNH BÁO',
        badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        desc: 'Mực nước sông Đà lên nhanh, nguy cơ sạt lở cao',
        time: '30 phút trước',
        statusDot: 'bg-amber-500',
      },
      {
        id: 2,
        title: 'Sạt lở tại Lào Cai',
        badge: 'CẢNH BÁO',
        badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        desc: 'Nguy cơ sạt lở đất tại khu vực đồi núi',
        time: '1 giờ trước',
        statusDot: 'bg-amber-500',
      },
    ];

    // 5 SOS mới nhất
    let sosQuery = this.sosRepo.createQueryBuilder('sos')
      .leftJoinAndSelect('sos.adminUnit', 'au')
      .leftJoinAndSelect('sos.province', 'p')
      .where('1=1')
      .orderBy('sos.createdAt', 'DESC')
      .limit(5);
    if (provinceId) {
      sosQuery.andWhere('sos.provinceId = :provinceId', { provinceId });
    }
    if (adminUnitId) {
      sosQuery.andWhere('sos.adminUnitId = :adminUnitId', { adminUnitId });
    }
    if (startDate) {
      sosQuery.andWhere('sos.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      const endVal = new Date(endDate);
      endVal.setHours(23, 59, 59, 999);
      sosQuery.andWhere('sos.createdAt <= :endDate', { endDate: endVal });
    }
    const dbSos = await sosQuery.getMany();

    const latestSos = dbSos.map((s) => ({
      id: s.id,
      title: s.description || 'Yêu cầu cứu hộ khẩn cấp',
      address: s.adminUnit && s.province 
        ? `${s.adminUnit.name}, ${s.province.name}` 
        : 'Địa chỉ chưa xác định',
      time: s.createdAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      status: s.status,
    }));

    return {
      disasters: disasters,
      latestSos: latestSos,
    };
  }

  // 4. Map markers & active missions
  async getMapTasks(
    provinceId: number | null,
    startDate?: Date,
    endDate?: Date,
    adminUnitId?: number,
  ): Promise<any> {
    // Lấy Đội cứu hộ hoạt động làm Markers
    let teamQuery = this.rescueTeamRepo.createQueryBuilder('rt')
      .where('rt.currentLocation IS NOT NULL');
    if (provinceId) {
      teamQuery.andWhere('rt.provinceId = :provinceId', { provinceId });
    }
    if (adminUnitId) {
      teamQuery.andWhere('rt.adminUnitId = :adminUnitId', { adminUnitId });
    }
    const dbTeams = await teamQuery.getMany();

    const teamMarkers = dbTeams.map((t) => {
      const coords = t.currentLocation?.coordinates || [106.660172, 10.762622];
      return {
        id: `team-${t.id}`,
        type: 'team',
        lat: coords[1],
        lng: coords[0],
        title: t.name,
        status: t.status,
      };
    });

    // Lấy SOS khẩn cấp làm Markers
    let sosQuery = this.sosRepo.createQueryBuilder('sos')
      .where('sos.status IN (:...statuses)', {
        statuses: [SosStatus.PENDING, SosStatus.DISPATCHED, SosStatus.ON_SITE],
      });
    if (provinceId) {
      sosQuery.andWhere('sos.provinceId = :provinceId', { provinceId });
    }
    if (adminUnitId) {
      sosQuery.andWhere('sos.adminUnitId = :adminUnitId', { adminUnitId });
    }
    if (startDate) {
      sosQuery.andWhere('sos.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      const endVal = new Date(endDate);
      endVal.setHours(23, 59, 59, 999);
      sosQuery.andWhere('sos.createdAt <= :endDate', { endDate: endVal });
    }
    const dbSos = await sosQuery.getMany();

    const sosMarkers = dbSos.map((s) => {
      const coords = s.location?.coordinates || [106.660172, 10.762622];
      return {
        id: `sos-${s.id}`,
        type: 'sos',
        lat: coords[1],
        lng: coords[0],
        title: s.description || 'Yêu cầu SOS',
        severity: s.severity,
      };
    });

    // Nhiệm vụ đang thực hiện (Missions)
    let missionQuery = this.sosRepo.createQueryBuilder('sos')
      .leftJoinAndSelect('sos.assignedTeam', 'team')
      .leftJoinAndSelect('sos.adminUnit', 'au')
      .where('sos.status IN (:...statuses)', {
        statuses: [SosStatus.DISPATCHED, SosStatus.ON_SITE],
      })
      .orderBy('sos.updatedAt', 'DESC')
      .limit(5);
    if (provinceId) {
      missionQuery.andWhere('sos.provinceId = :provinceId', { provinceId });
    }
    if (adminUnitId) {
      missionQuery.andWhere('sos.adminUnitId = :adminUnitId', { adminUnitId });
    }
    if (startDate) {
      missionQuery.andWhere('sos.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      const endVal = new Date(endDate);
      endVal.setHours(23, 59, 59, 999);
      missionQuery.andWhere('sos.createdAt <= :endDate', { endDate: endVal });
    }
    const dbMissions = await missionQuery.getMany();

    const missions = dbMissions.map((m) => ({
      id: m.id,
      name: m.description || `Cứu hộ tại ${m.adminUnit?.name || 'địa phương'}`,
      team: m.assignedTeam?.name || 'Đội phản ứng nhanh',
      percent: m.status === SosStatus.ON_SITE ? 75 : 50,
      color: m.status === SosStatus.ON_SITE ? 'bg-blue-500' : 'bg-amber-500',
    }));

    return {
      markers: [...teamMarkers, ...sosMarkers],
      missions: missions,
    };
  }

  // 5. Thống kê vật tư cứu trợ & đóng góp tài chính
  async getResources(
    provinceId: number | null,
    startDate?: Date,
    endDate?: Date,
    adminUnitId?: number,
  ): Promise<any> {
    // Lấy hàng hóa thiết bị cứu trợ từ kho DB
    let equipQuery = this.equipmentRepo.createQueryBuilder('e')
      .select('e.name', 'name')
      .addSelect('SUM(e.quantity)', 'current')
      .groupBy('e.name');
    if (provinceId) {
      equipQuery.innerJoin('e.team', 'team')
        .where('team.provinceId = :provinceId', { provinceId });
      if (adminUnitId) {
        equipQuery.andWhere('team.adminUnitId = :adminUnitId', { adminUnitId });
      }
    }
    const dbEquip = await equipQuery.getRawMany();

    const inventory = dbEquip.map((eq) => {
      const current = Number(eq.current);
      const target = Math.max(current * 1.2, 50);
      const percent = Math.min(Math.round((current / target) * 100), 100);
      return {
        name: eq.name,
        current,
        target: Math.round(target),
        percent,
        color: percent > 80 ? 'bg-emerald-500' : percent > 50 ? 'bg-blue-500' : 'bg-rose-500',
      };
    });

    // Lấy quyên góp thực tế
    let donationQuery = this.donationRepo.createQueryBuilder('d')
      .select('SUM(d.amountVnd)', 'total')
      .where('d.status IN (:...statuses)', {
        statuses: [DonationStatus.RECEIVED, DonationStatus.DISTRIBUTED],
      });
    if (provinceId) {
      donationQuery.andWhere('d.provinceId = :provinceId', { provinceId });
    }
    if (startDate) {
      donationQuery.andWhere('d.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      const endVal = new Date(endDate);
      endVal.setHours(23, 59, 59, 999);
      donationQuery.andWhere('d.createdAt <= :endDate', { endDate: endVal });
    }
    const donationSum = await donationQuery.getRawOne();
    const totalDonations = donationSum?.total ? Number(donationSum.total) : 0;

    return {
      inventory,
      donations: {
        totalAmount: totalDonations,
        trendPercent: 0,
        sparkline: [totalDonations, totalDonations, totalDonations, totalDonations, totalDonations, totalDonations, totalDonations],
      },
    };
  }
}
