import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProvinceEntity } from '../entities/province.entity';
import { RoleEntity } from '../entities/role.entity';
import { UserEntity } from '../entities/user.entity';
import { UserRoleEntity } from '../entities/user-role.entity';
import { TeamSpecializationEntity } from '../entities/team-specialization.entity';
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
  ) {}

  async seed() {
    this.logger.log('Starting database seeding...');
    await this.seedProvinces();
    await this.seedRoles();
    await this.seedTeamSpecializations();
    await this.seedAdmins();
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
        where: { name: spec.name, teamType: spec.teamType as any },
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
      const { password, provinceCode, roleName, ...userData } = adminData;

      let user = await this.userRepo.findOne({
        where: [
          { email: userData.email },
          { phone: userData.phone },
          { nationalId: userData.nationalId },
        ],
      });

      if (!user) {
        const province = await this.provinceRepo.findOne({
          where: { code: provinceCode },
        });
        if (!province) {
          this.logger.warn(
            `Province with code ${provinceCode} not found for admin ${userData.email}`,
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
      }

      // Tạo user_role record nếu chưa có
      if (!user) continue;

      const role = await this.roleRepo.findOne({
        where: { name: roleName },
      });
      if (!role) continue;

      const province = await this.provinceRepo.findOne({
        where: { code: provinceCode },
      });
      if (!province) continue;

      const existingUserRole = await this.userRoleRepo.findOne({
        where: { userId: user.id, roleId: role.id, provinceId: province.id },
      });

      if (!existingUserRole) {
        await this.userRoleRepo.save(
          this.userRoleRepo.create({
            userId: user.id,
            roleId: role.id,
            provinceId: province.id,
            isActive: true,
          }),
        );
        this.logger.debug(
          `Assigned role ${roleName} to ${userData.email} in province ${provinceCode}`,
        );
      }
    }
  }
}
