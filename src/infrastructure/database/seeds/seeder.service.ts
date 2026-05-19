import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProvinceEntity } from '../entities/province.entity';
import { RoleEntity } from '../entities/role.entity';
import { UserEntity } from '../entities/user.entity';
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
  ) {}

  async seed() {
    this.logger.log('Starting database seeding...');
    await this.seedProvinces();
    await this.seedRoles();
    await this.seedAdmins();
    this.logger.log('Database seeding completed successfully.');
  }

  private async seedProvinces() {
    this.logger.log('Seeding Provinces...');
    const filePath = path.join(__dirname, 'data', 'provinces.json');
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const provinces = JSON.parse(rawData);

    for (const province of provinces) {
      const exists = await this.provinceRepo.findOne({ where: { code: province.code } });
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
      const exists = await this.roleRepo.findOne({ where: { name: role.name } });
      if (!exists) {
        await this.roleRepo.save(this.roleRepo.create(role));
        this.logger.debug(`Inserted role: ${role.name}`);
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

      const adminExists = await this.userRepo.findOne({ where: { email: userData.email } });
      if (!adminExists) {
        const province = await this.provinceRepo.findOne({ where: { code: provinceCode } });
        if (!province) {
          this.logger.warn(`Province with code ${provinceCode} not found for admin ${userData.email}`);
          continue;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await this.userRepo.save(
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
        );
        this.logger.debug(`Inserted Admin: ${userData.email}`);
        
        // Optionally assign Role explicitly here if there is a UserRole mapping needed.
      }
    }
  }
}
