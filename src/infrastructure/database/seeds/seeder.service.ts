import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProvinceEntity } from '../entities/province.entity';
import { RoleEntity } from '../entities/role.entity';
import { UserEntity } from '../entities/user.entity';
import { UserRoleEntity } from '../entities/user-role.entity';
import { TeamSpecializationEntity } from '../entities/team-specialization.entity';
import { SystemSettingEntity } from '../entities/system-setting.entity';
import { SystemCategoryEntity } from '../entities/system-category.entity';
import { TeamType } from '@shared/core/enums/teamType.enum';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SeederService {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    @InjectRepository(ProvinceEntity)
    private readonly provinceRepo: Repository<ProvinceEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepo: Repository<RoleEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(UserRoleEntity)
    private readonly userRoleRepo: Repository<UserRoleEntity>,
    @InjectRepository(TeamSpecializationEntity)
    private readonly specRepo: Repository<TeamSpecializationEntity>,
    @InjectRepository(SystemSettingEntity)
    private readonly settingRepo: Repository<SystemSettingEntity>,
    @InjectRepository(SystemCategoryEntity)
    private readonly categoryRepo: Repository<SystemCategoryEntity>,
  ) {}

  async seed() {
    this.logger.log('Starting database seeding...');
    await this.seedProvinces();
    await this.seedRoles();
    await this.seedTeamSpecializations();
    await this.seedAdmins();
    await this.seedSettings();
    await this.seedCategories();
    this.logger.log('Database seeding completed successfully.');
  }

  private async seedProvinces() {
    this.logger.log('Seeding Provinces...');
    const filePath = path.join(__dirname, 'data', 'provinces.json');
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const provinces = JSON.parse(rawData);

    for (const province of provinces) {
      const exists = await this.provinceRepo.findOne({
        where: { code: province.code },
      });
      if (!exists) {
        await this.provinceRepo.save(this.provinceRepo.create(province));
        this.logger.debug(`Inserted province: ${province.name}`);
      }
    }
  }

  private async seedRoles() {
    this.logger.log('Seeding Roles...');
    const filePath = path.join(__dirname, 'data', 'roles.json');
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const roles = JSON.parse(rawData);

    for (const role of roles) {
      const exists = await this.roleRepo.findOne({
        where: { name: role.name },
      });
      if (!exists) {
        await this.roleRepo.save(this.roleRepo.create(role));
        this.logger.debug(`Inserted role: ${role.name}`);
      }
    }
  }

  private async seedTeamSpecializations() {
    this.logger.log('Seeding Team Specializations...');
    const specs = [
      // PCCC
      {
        code: 'PCCC_CHUA_CHAY',
        name: 'Chữa cháy',
        teamType: TeamType.PCCC,
        description: 'Chữa cháy các loại',
      },
      {
        code: 'PCCC_CUU_HO',
        name: 'Cứu hộ',
        teamType: TeamType.PCCC,
        description: 'Cứu hộ tai nạn',
      },
      {
        code: 'PCCC_Kiem_Tra',
        name: 'Kiểm tra an toàn',
        teamType: TeamType.PCCC,
        description: 'Kiểm tra PCCC',
      },
      // Y_TE
      {
        code: 'YTE_SO_CUU',
        name: 'Sơ cấp cứu',
        teamType: TeamType.Y_TE,
        description: 'Sơ cấp cứu ban đầu',
      },
      {
        code: 'YTE_TRIAGE',
        name: 'Phân loại bệnh nhân',
        teamType: TeamType.Y_TE,
        description: 'Phân loại nạn nhân',
      },
      {
        code: 'YTE_VAN_CHuyen',
        name: 'Vận chuyển nạn nhân',
        teamType: TeamType.Y_TE,
        description: 'Vận chuyển nạn nhân',
      },
      // DAN_PHONG
      {
        code: 'DP_TIM_KIEM',
        name: 'Tìm kiếm cứu nạn',
        teamType: TeamType.DAN_PHONG,
        description: 'Tìm kiếm trong thiên tai',
      },
      {
        code: 'DP_TRUONG_THANH',
        name: 'Trường thành',
        teamType: TeamType.DAN_PHONG,
        description: 'Xây dựng trường thành',
      },
      // QUAN_SU
      {
        code: 'QS_HOI_SINH',
        name: 'Hồi sinh',
        teamType: TeamType.QUAN_SU,
        description: 'Hồi sinh cơ thể',
      },
      // TINH_NGUYEN
      {
        code: 'TN_VAN_TAI',
        name: 'Vận tải',
        teamType: TeamType.TINH_NGUYEN,
        description: 'Vận tải cứu hộ',
      },
      {
        code: 'TN_TIEN_TRINH',
        name: 'Tiếp tế',
        teamType: TeamType.TINH_NGUYEN,
        description: 'Tiếp tế lương thực',
      },
      // TONG_HOP
      {
        code: 'TH_TOAN_RONG',
        name: 'Toàn rừng',
        teamType: TeamType.TONG_HOP,
        description: 'Tìm kiếm toàn rừng',
      },
    ];

    for (const spec of specs) {
      const exists = await this.specRepo.findOne({
        where: { name: spec.name, teamType: spec.teamType },
      });
      if (!exists) {
        await this.specRepo.save(
          this.specRepo.create({ ...spec, isActive: true }),
        );
        this.logger.debug(`Inserted specialization: ${spec.name}`);
      }
    }
  }

  private async seedAdmins() {
    this.logger.log('Seeding System and Province Admins from JSON...');
    const filePath = path.join(__dirname, 'data', 'admin-users.json');
    if (!fs.existsSync(filePath)) {
      this.logger.warn('admin-users.json not found, skipping admin seeding.');
      return;
    }

    const rawData = fs.readFileSync(filePath, 'utf-8');
    const admins = JSON.parse(rawData);

    for (const adminData of admins) {
      const { password, provinceId, roleName, ...userData } = adminData;

      let user = await this.userRepo.findOne({
        where: [
          { email: userData.email },
          { phone: userData.phone },
          { nationalId: userData.nationalId },
        ],
      });

      if (!user) {
        const province = await this.provinceRepo.findOne({
          where: { id: provinceId },
        });
        if (!province) {
          this.logger.warn(
            `Province with ID ${provinceId} not found for admin ${userData.email}`,
          );
          continue;
        }

        const role = await this.roleRepo.findOne({
          where: { name: roleName },
        });
        if (!role) {
          this.logger.warn(
            `Role "${roleName}" not found for admin ${userData.email}`,
          );
          continue;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        user = (await this.userRepo.save(
          this.userRepo.create({
            ...userData,
            password: hashedPassword,
            nationalIdVerified: true,
            dateOfBirth: new Date('1990-01-01'),
            gender: 'MALE' as any,
            phoneVerified: true,
            emailVerified: true,
            trustScore: 100,
            isVerified: true,
            isActive: true,
            provinceId: province.id,
          }),
        )) as unknown as UserEntity;
        this.logger.debug(`Inserted Admin: ${userData.email}`);
      } else {
        const province = await this.provinceRepo.findOne({
          where: { id: provinceId },
        });
        if (province && user.provinceId !== province.id) {
          user.provinceId = province.id;
          await this.userRepo.save(user);
          this.logger.debug(
            `Synchronized Admin provinceId for ${userData.email} to province ID ${provinceId}`,
          );
        }
      }

      // Tạo user_role record nếu chưa có
      if (!user) continue;

      const role = await this.roleRepo.findOne({
        where: { name: roleName },
      });
      if (!role) continue;

      const province = await this.provinceRepo.findOne({
        where: { id: provinceId },
      });
      if (!province) continue;

      const existingUserRole = await this.userRoleRepo.findOne({
        where: { userId: user.id, roleId: role.id, provinceId: province.id },
      });

      if (!existingUserRole) {
        await this.userRoleRepo.delete({
          userId: user.id,
          roleId: role.id,
        });

        await this.userRoleRepo.save(
          this.userRoleRepo.create({
            userId: user.id,
            roleId: role.id,
            provinceId: province.id,
            isActive: true,
          }),
        );
        this.logger.debug(
          `Assigned role ${roleName} to ${userData.email} in province ID ${provinceId}`,
        );
      }
    }
  }

  private async seedSettings() {
    this.logger.log('Seeding System Settings...');
    const defaultSettings = [
      {
        key: 'system.name',
        value: 'Cứu hộ Việt Nam',
        group: 'general',
        description: 'Tên hiển thị của hệ thống',
      },
      {
        key: 'system.code',
        value: 'RESCUE-VN',
        group: 'general',
        description: 'Mã định danh hệ thống',
      },
      {
        key: 'system.description',
        value: 'Hệ thống quản lý cứu hộ và ứng phó thiên tai',
        group: 'general',
        description: 'Mô tả ngắn của hệ thống',
      },
      {
        key: 'system.language',
        value: 'vi',
        group: 'general',
        description: 'Ngôn ngữ mặc định',
      },
      {
        key: 'system.timezone',
        value: 'GMT+7',
        group: 'general',
        description: 'Múi giờ mặc định',
      },
      {
        key: 'system.date_format',
        value: 'DD/MM/YYYY',
        group: 'general',
        description: 'Định dạng ngày hiển thị',
      },
      {
        key: 'system.time_format',
        value: '24h',
        group: 'general',
        description: 'Định dạng giờ hiển thị',
      },
      {
        key: 'system.page_size',
        value: '20',
        group: 'general',
        description: 'Số bản ghi hiển thị mặc định',
      },
      {
        key: 'system.logo',
        value: 'logo.png',
        group: 'general',
        description: 'Tệp logo thương hiệu',
      },
      {
        key: 'system.favicon',
        value: 'favicon.ico',
        group: 'general',
        description: 'Tệp favicon',
      },
      {
        key: 'system.copyright',
        value: '© 2026 Cứu Hộ Việt Nam. All rights reserved.',
        group: 'general',
        description: 'Thông tin bản quyền dưới chân trang',
      },
      {
        key: 'system.website',
        value: 'https://cuuhovietnam.gov.vn',
        group: 'general',
        description: 'Trang thông tin chính thức',
      },
      {
        key: 'system.support_email',
        value: 'support@cuuhovietnam.gov.vn',
        group: 'general',
        description: 'Email hỗ trợ kỹ thuật',
      },
      {
        key: 'system.support_hotline',
        value: '1900 1234',
        group: 'general',
        description: 'Hotline tổng đài chi viện',
      },

      {
        key: 'auth.password.min_length',
        value: '8',
        group: 'security',
        description: 'Độ dài mật khẩu tối thiểu',
      },
      {
        key: 'auth.lockout_duration',
        value: '15m',
        group: 'security',
        description: 'Thời gian khóa tài khoản tạm thời',
      },
      {
        key: 'auth.max_attempts',
        value: '5',
        group: 'security',
        description: 'Số lần đăng nhập sai tối đa',
      },
      {
        key: 'auth.allow_concurrent',
        value: 'true',
        group: 'security',
        description: 'Cho phép đăng nhập đồng thời nhiều thiết bị',
      },
      {
        key: 'auth.enable_2fa',
        value: 'false',
        group: 'security',
        description: 'Bắt buộc xác thực hai bước',
      },

      {
        key: 'sos.expiry_time',
        value: '120',
        group: 'sos',
        description: 'Thời gian yêu cầu SOS hết hạn (phút)',
      },
      {
        key: 'sos.search_radius',
        value: '15',
        group: 'sos',
        description: 'Bán kính tìm kiếm đội cứu hộ xung quanh (km)',
      },
      {
        key: 'sos.retry_count',
        value: '3',
        group: 'sos',
        description: 'Số lần tự động gửi lại tín hiệu',
      },
      {
        key: 'sos.auto_close',
        value: 'true',
        group: 'sos',
        description: 'Tự động đóng sự cố SOS sau khi hoàn thành',
      },
      {
        key: 'sos.allow_hardware',
        value: 'true',
        group: 'sos',
        description: 'Cho phép SOS từ nút ấn khẩn cấp cứng',
      },
      {
        key: 'sos.allow_app',
        value: 'true',
        group: 'sos',
        description: 'Cho phép phát SOS từ app di động',
      },

      {
        key: 'dispatch.max_teams',
        value: '3',
        group: 'sos',
        description: 'Số đội cứu hộ tối đa tham gia xử lý 1 sự cố',
      },
      {
        key: 'dispatch.prioritize_nearest',
        value: 'true',
        group: 'sos',
        description: 'Ưu tiên đội gần nhất',
      },
      {
        key: 'dispatch.prioritize_specialty',
        value: 'true',
        group: 'sos',
        description: 'Ưu tiên đội theo chuyên môn phù hợp sự cố',
      },
      {
        key: 'dispatch.allow_inter_province',
        value: 'false',
        group: 'sos',
        description: 'Cho phép điều động đội liên tỉnh',
      },
      {
        key: 'dispatch.radius_steps',
        value: '5000,10000,20000,40000,50000',
        group: 'dispatch',
        description:
          'Các mốc bán kính quét tìm kiếm đội cứu hộ (mét, ngăn cách bởi dấu phẩy)',
      },
      {
        key: 'dispatch.weight_distance',
        value: '0.5',
        group: 'dispatch',
        description:
          'Trọng số khoảng cách khi tính điểm phù hợp của đội cứu hộ (0 đến 1)',
      },
      {
        key: 'dispatch.weight_active_cases',
        value: '0.3',
        group: 'dispatch',
        description:
          'Trọng số ca đang xử lý khi tính điểm phù hợp của đội cứu hộ (0 đến 1)',
      },
      {
        key: 'dispatch.weight_skill_mismatch',
        value: '0.2',
        group: 'dispatch',
        description:
          'Trọng số độ lệch chuyên ngành khi tính điểm phù hợp của đội cứu hộ (0 đến 1)',
      },
      {
        key: 'dispatch.skill_mapping',
        value:
          '{"FLOOD":{"DAN_PHONG":0.0,"QUAN_SU":0.0,"TONG_HOP":0.2,"PCCC":0.6,"Y_TE":0.8,"TINH_NGUYEN":0.5},"FIRE_FIGHTING":{"PCCC":0.0,"TONG_HOP":0.3,"QUAN_SU":0.5,"DAN_PHONG":0.8,"Y_TE":0.9,"TINH_NGUYEN":0.7},"TRAFFIC_ACCIDENT":{"Y_TE":0.0,"PCCC":0.2,"TONG_HOP":0.3,"DAN_PHONG":0.6,"QUAN_SU":0.7,"TINH_NGUYEN":0.5},"MEDICAL_EMERGENCY":{"Y_TE":0.0,"TONG_HOP":0.3,"DAN_PHONG":0.7,"PCCC":0.8,"QUAN_SU":0.8,"TINH_NGUYEN":0.6},"NATURAL_DISASTER":{"QUAN_SU":0.0,"DAN_PHONG":0.2,"TONG_HOP":0.2,"PCCC":0.5,"Y_TE":0.6,"TINH_NGUYEN":0.4},"OTHER":{"DAN_PHONG":0.2,"PCCC":0.2,"QUAN_SU":0.2,"TINH_NGUYEN":0.2,"Y_TE":0.2,"TONG_HOP":0.0}}',
        group: 'dispatch',
        description:
          'Ánh xạ chuyên môn giữa loại sự cố SOS và loại đội cứu hộ (định dạng JSON)',
      },

      {
        key: 'severity.critical',
        value: '15',
        group: 'sos',
        description: 'Thời gian phản hồi SLA khẩn cấp cao (phút)',
      },
      {
        key: 'severity.high',
        value: '30',
        group: 'sos',
        description: 'Thời gian phản hồi SLA mức cao (phút)',
      },
      {
        key: 'severity.medium',
        value: '60',
        group: 'sos',
        description: 'Thời gian phản hồi SLA trung bình (phút)',
      },
      {
        key: 'severity.low',
        value: '120',
        group: 'sos',
        description: 'Thời gian phản hồi SLA mức thấp (phút)',
      },

      {
        key: 'map.coordinate_system',
        value: 'EPSG:4326',
        group: 'map',
        description: 'Hệ tọa độ hiển thị bản đồ số',
      },
      {
        key: 'map.provider',
        value: 'OpenStreetMap',
        group: 'map',
        description: 'Nhà cung cấp bản đồ nền',
      },
      {
        key: 'map.update_frequency',
        value: '15',
        group: 'map',
        description: 'Tần suất cập nhật tọa độ GPS trực tuyến (giây)',
      },
      {
        key: 'map.auto_refresh',
        value: 'true',
        group: 'map',
        description: 'Tự động làm mới bản đồ khi có định vị mới',
      },

      {
        key: 'geofence.enable',
        value: 'true',
        group: 'map',
        description: 'Bật hàng rào địa lý cảnh báo',
      },
      {
        key: 'geofence.warning_radius',
        value: '500',
        group: 'map',
        description: 'Bán kính geofence cảnh báo nguy hiểm (mét)',
      },
      {
        key: 'geofence.breach_distance',
        value: '100',
        group: 'map',
        description: 'Khoảng cách geofence vượt vùng an toàn (mét)',
      },
    ];

    for (const setting of defaultSettings) {
      const exists = await this.settingRepo.findOne({
        where: { key: setting.key },
      });
      if (!exists) {
        await this.settingRepo.save(this.settingRepo.create(setting));
        this.logger.debug(`Seeded system setting: ${setting.key}`);
      }
    }
  }

  private async seedCategories() {
    this.logger.log('Seeding System Categories...');
    const defaultCategories = [
      // Rescue Team Types
      {
        type: 'RESCUE_TEAM_TYPE',
        code: 'MILITARY',
        name: 'Lực lượng quân đội chi viện',
        orderIndex: 1,
      },
      {
        type: 'RESCUE_TEAM_TYPE',
        code: 'VOLUNTEER_GROUP',
        name: 'Đoàn tình nguyện tự phát',
        orderIndex: 2,
      },
      {
        type: 'RESCUE_TEAM_TYPE',
        code: 'LOCAL_CIVILIAN',
        name: 'Đội tự quản dân phòng cấp xã',
        orderIndex: 3,
      },
      {
        type: 'RESCUE_TEAM_TYPE',
        code: 'RED_CROSS',
        name: 'Hội chữ thập đỏ',
        orderIndex: 4,
      },

      // Mission Types
      {
        type: 'MISSION_TYPE',
        code: 'EVACUATION',
        name: 'Di dời dân cư vùng lũ quét',
        orderIndex: 1,
      },
      {
        type: 'MISSION_TYPE',
        code: 'SUPPLY_DELIVERY',
        name: 'Vận chuyển nhu yếu phẩm tế trợ',
        orderIndex: 2,
      },
      {
        type: 'MISSION_TYPE',
        code: 'MEDICAL_SUPPORT',
        name: 'Cứu thương & hỗ trợ sơ tán y tế',
        orderIndex: 3,
      },
      {
        type: 'MISSION_TYPE',
        code: 'SEARCH_RESCUE',
        name: 'Tìm kiếm cứu hộ đường thủy',
        orderIndex: 4,
      },

      // Vehicle Types
      {
        type: 'VEHICLE_TYPE',
        code: 'MOTORBOAT',
        name: 'Xuồng cao tốc có động cơ',
        orderIndex: 1,
      },
      {
        type: 'VEHICLE_TYPE',
        code: 'RUBBER_BOAT',
        name: 'Xuồng cao su chèo tay',
        orderIndex: 2,
      },
      {
        type: 'VEHICLE_TYPE',
        code: 'AMBULANCE',
        name: 'Xe cứu thương chuyên dụng',
        orderIndex: 3,
      },
      {
        type: 'VEHICLE_TYPE',
        code: 'TRUCK_HEAVY',
        name: 'Xe tải lội nước gầm cao',
        orderIndex: 4,
      },

      // Equipment Types
      {
        type: 'EQUIPMENT_TYPE',
        code: 'LIFE_VEST',
        name: 'Áo phao cứu sinh tiêu chuẩn',
        orderIndex: 1,
      },
      {
        type: 'EQUIPMENT_TYPE',
        code: 'LIFE_BUOY',
        name: 'Pao tròn cứu sinh cứu nạn',
        orderIndex: 2,
      },
      {
        type: 'EQUIPMENT_TYPE',
        code: 'FLASHLIGHT',
        name: 'Đèn pin siêu sáng chống nước',
        orderIndex: 3,
      },
      {
        type: 'EQUIPMENT_TYPE',
        code: 'ROPE_HEAVY',
        name: 'Dây thừng kéo cứu sinh chịu lực',
        orderIndex: 4,
      },
    ];

    for (const cat of defaultCategories) {
      const exists = await this.categoryRepo.findOne({
        where: { code: cat.code },
      });
      if (!exists) {
        await this.categoryRepo.save(
          this.categoryRepo.create({ ...cat, isActive: true }),
        );
        this.logger.debug(`Seeded category dictionary: ${cat.code}`);
      }
    }
  }
}
