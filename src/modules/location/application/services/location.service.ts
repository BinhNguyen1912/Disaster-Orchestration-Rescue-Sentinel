import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProvinceEntity } from '@infrastructure/database/entities/province.entity';
import { AdministrativeUnitEntity } from '@infrastructure/database/entities/administrative-unit.entity';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LocationService {
  constructor(
    @InjectRepository(ProvinceEntity)
    private readonly provinceRepo: Repository<ProvinceEntity>,
    @InjectRepository(AdministrativeUnitEntity)
    private readonly wardRepo: Repository<AdministrativeUnitEntity>,
  ) {}

  async getAllProvinces() {
    return this.provinceRepo.find({
      order: { name: 'ASC' },
    });
  }

  async getProvinceById(id: number) {
    return this.provinceRepo.findOne({ where: { id } });
  }

  async getProvinceByCode(code: number) {
    return this.provinceRepo.findOne({ where: { code } });
  }

  async getWardsByProvinceId(provinceId: number) {
    return this.wardRepo.find({
      where: { provinceId },
      order: { name: 'ASC' },
    });
  }

  async getWardById(id: number) {
    return this.wardRepo.findOne({ where: { id } });
  }

  getProvinceCenters(): { provinceCode: number; lat: number; lng: number }[] {
    const filePath = path.join(process.cwd(), 'src', 'infrastructure', 'database', 'seeds', 'data', 'province-centers.json');
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  }
}