import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProvinceEntity } from '@infrastructure/database/entities/province.entity';
import { AdministrativeUnitEntity } from '@infrastructure/database/entities/administrative-unit.entity';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

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

  async queryGeocoding(
    query: string,
    limit: number = 6,
    viewbox?: string,
  ): Promise<any[]> {
    return new Promise((resolve) => {
      const cleanedQuery = query
        .replace(/^(Xã|Phường|Thị trấn|Quận|Huyện|Thành phố|Tỉnh)\s+/gi, '')
        .replace(
          /,\s*(Xã|Phường|Thị trấn|Quận|Huyện|Thành phố|Tỉnh)\s+/gi,
          ', ',
        );

      let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        cleanedQuery + ', Vietnam',
      )}&limit=${limit}&addressdetails=1`;

      if (viewbox) {
        url += `&viewbox=${encodeURIComponent(viewbox)}&bounded=1`;
      }

      const options = {
        headers: {
          'User-Agent': 'RescueSystem/1.0',
          'Accept-Language': 'vi',
        },
      };

      https
        .get(url, options, (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              const results = JSON.parse(data);
              resolve(results);
            } catch (e) {
              resolve([]);
            }
          });
          res.on('error', () => resolve([]));
        })
        .on('error', () => resolve([]));
    });
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

    // Strategy 2: fallback — nearest province by centerPoint, then nearest unit within that province
    // This prevents cross-province contamination (e.g. Nhà Bè coords resolving to Bình Dương)
    const nearestProvince = await this.provinceRepo
      .createQueryBuilder('province')
      .where('province.centerPoint IS NOT NULL')
      .orderBy(
        `ST_Distance(province.centerPoint, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326))`,
        'ASC',
      )
      .setParameters({ lat, lng })
      .getOne();

    if (nearestProvince) {
      const nearestUnitInProvince = await this.wardRepo
        .createQueryBuilder('unit')
        .where('unit.provinceId = :provinceId AND unit.centerPoint IS NOT NULL', {
          provinceId: nearestProvince.id,
        })
        .orderBy(
          `ST_Distance(unit.centerPoint, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326))`,
          'ASC',
        )
        .setParameters({ lat, lng })
        .getOne();

      if (nearestUnitInProvince) return nearestUnitInProvince;
    }

    // Strategy 3: last resort — nearest unit globally (old behavior)
    const nearestUnit = await this.wardRepo
      .createQueryBuilder('unit')
      .where('unit.centerPoint IS NOT NULL')
      .orderBy(
        `ST_Distance(unit.centerPoint, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326))`,
        'ASC',
      )
      .setParameters({ lat, lng })
      .getOne();

    return nearestUnit || null;
  }

  async findFirstUnit(): Promise<AdministrativeUnitEntity | null> {
    return this.wardRepo.findOne({ where: {} });
  }
}
