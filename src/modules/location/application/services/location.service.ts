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
    const filePath = path.join(
      process.cwd(),
      'src',
      'infrastructure',
      'database',
      'seeds',
      'data',
      'province-centers.json',
    );
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  }

  async findUnitByCoordinates(
    lat: number,
    lng: number,
  ): Promise<AdministrativeUnitEntity | null> {
    // 1. Try finding administrative unit that contains the point
    const containingUnit = await this.wardRepo
      .createQueryBuilder('unit')
      .where(
        'unit.boundary IS NOT NULL AND ST_Contains(unit.boundary, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326))',
        { lat, lng },
      )
      .getOne();

    if (containingUnit) {
      return containingUnit;
    }

    // 2. Fallback: Find the nearest administrative unit by centerPoint distance
    const nearestUnit = await this.wardRepo
      .createQueryBuilder('unit')
      .where('unit.centerPoint IS NOT NULL')
      .orderBy(
        'ST_Distance(unit.centerPoint, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326))',
        'ASC',
      )
      .getOne();

    return nearestUnit || null;
  }
}
