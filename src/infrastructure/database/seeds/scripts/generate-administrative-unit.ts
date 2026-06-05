import { DataSource } from 'typeorm';
import fs from 'fs/promises';
import path from 'path';
import https from 'https';

export enum AdministrativeUnitType {
  DISTRICT = 'DISTRICT',
  COMMUNE = 'COMMUNE',
  WARD = 'WARD',
  HAMLET = 'HAMLET',
}

type Province = {
  code: number;
  name: string;
  shortName: string;
};

type ProvinceWithId = {
  id: number;
  code: number;
};

type RepoWard = {
  Code: string;
  Name: string;
  NameEn: string;
  FullName: string;
  ProvinceCode: string;
};

type RepoProvince = {
  Code: string;
  Name: string;
  Wards: RepoWard[];
};

type AdministrativeUnit = {
  id: number;
  provinceId: number;
  parentId: number | null;
  type: AdministrativeUnitType;
  code: string;
  name: string;
  boundary: null;
  centerPoint: null;
};

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');
}

function getType(fullName: string): AdministrativeUnitType {
  const lower = fullName.toLowerCase();

  if (lower.startsWith('phường')) {
    return AdministrativeUnitType.WARD;
  }

  if (lower.startsWith('xã')) {
    return AdministrativeUnitType.COMMUNE;
  }

  if (
    lower.startsWith('đặc khu') ||
    lower.startsWith('ấp') ||
    lower.startsWith('thôn') ||
    lower.startsWith('bản') ||
    lower.startsWith('khóm')
  ) {
    return AdministrativeUnitType.HAMLET;
  }

  return AdministrativeUnitType.COMMUNE;
}

function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  const dataDir = path.join(__dirname, '..', 'data');

  // Fetch ward data from repo
  console.log('Fetching ward data from GitHub...');
  const repoUrl =
    'https://raw.githubusercontent.com/ThangLeQuoc/vietnamese-provinces-database/master/json/simplified_json_generated_data_vn_units.json';

  const repoData: RepoProvince[] = await fetchJson(repoUrl);
  console.log(`Fetched ${repoData.length} provinces from repo`);

  // Read provinces from DB to get id mapping
  console.log('Connecting to database to get province mapping...');
  const AppDataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5433,
    username: 'postgres',
    password: '123123',
    database: 'rescue_system',
  });
  await AppDataSource.initialize();

  const dbProvinces = await AppDataSource.query(
    'SELECT id, code FROM province ORDER BY id',
  ) as ProvinceWithId[];

  // Build map: province.code (number) -> province.id (number)
  const provinceCodeToId = new Map<number, number>();
  for (const p of dbProvinces) {
    provinceCodeToId.set(p.code, p.id);
  }
  console.log(`Loaded ${dbProvinces.length} provinces from DB`);

  // Generate administrative units
  const units: AdministrativeUnit[] = [];
  let currentId = 1;

  for (const province of repoData) {
    // Convert repo province code string "01" -> number 1
    const provinceCodeNum = parseInt(province.Code, 10);
    const provinceId = provinceCodeToId.get(provinceCodeNum);

    if (!provinceId) {
      console.warn(`Province not found in DB: ${province.Code} (${province.Name})`);
      continue;
    }

    for (const ward of province.Wards) {
      units.push({
        id: currentId++,
        provinceId,
        parentId: null,
        type: getType(ward.FullName),
        code: slugify(ward.Name),
        name: ward.Name,
        boundary: null,
        centerPoint: null,
      });
    }
  }

  await AppDataSource.destroy();

  // Save to file
  await fs.writeFile(
    path.join(dataDir, 'administrative-unit.json'),
    JSON.stringify(units, null, 2),
    'utf-8',
  );

  console.log(`Generated ${units.length} administrative units`);
  console.log(`Saved to ${path.join(dataDir, 'administrative-unit.json')}`);
}

main().catch(console.error);