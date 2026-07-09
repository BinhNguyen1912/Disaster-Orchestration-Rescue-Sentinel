import { Test, TestingModule } from '@nestjs/testing';
import { LocationService } from './location.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProvinceEntity } from '@infrastructure/database/entities/province.entity';
import { AdministrativeUnitEntity } from '@infrastructure/database/entities/administrative-unit.entity';

describe('LocationService', () => {
  let service: LocationService;

  // Builder helper để mock createQueryBuilder chain
  const createQbMock = (result: any) => ({
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    setParameters: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(result),
  });

  const mockProvinceRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockWardRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationService,
        {
          provide: getRepositoryToken(ProvinceEntity),
          useValue: mockProvinceRepo,
        },
        {
          provide: getRepositoryToken(AdministrativeUnitEntity),
          useValue: mockWardRepo,
        },
      ],
    }).compile();

    service = module.get<LocationService>(LocationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllProvinces', () => {
    it('should return all provinces ordered by name', async () => {
      const mockProvinces = [
        { id: 1, code: 1, name: 'Thành phố Hà Nội' },
        { id: 4, code: 4, name: 'Tỉnh Cao Bằng' },
      ];
      mockProvinceRepo.find.mockResolvedValue(mockProvinces);

      const result = await service.getAllProvinces();

      expect(result).toEqual(mockProvinces);
      expect(mockProvinceRepo.find).toHaveBeenCalledWith({
        order: { name: 'ASC' },
      });
    });

    it('should return empty array when no provinces exist', async () => {
      mockProvinceRepo.find.mockResolvedValue([]);

      const result = await service.getAllProvinces();

      expect(result).toEqual([]);
    });
  });

  describe('getProvinceById', () => {
    it('should return province when found', async () => {
      const mockProvince = { id: 1, code: 1, name: 'Thành phố Hà Nội' };
      mockProvinceRepo.findOne.mockResolvedValue(mockProvince);

      const result = await service.getProvinceById(1);

      expect(result).toEqual(mockProvince);
      expect(mockProvinceRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should return null when province not found', async () => {
      mockProvinceRepo.findOne.mockResolvedValue(null);

      const result = await service.getProvinceById(999);

      expect(result).toBeNull();
    });
  });

  describe('getWardsByProvinceId', () => {
    it('should return wards for given province', async () => {
      const mockWards = [
        { id: 1, provinceId: 1, name: 'Phường Ba Đình', type: 'WARD' },
        { id: 2, provinceId: 1, name: 'Phường Hoàn Kiếm', type: 'WARD' },
      ];
      mockWardRepo.find.mockResolvedValue(mockWards);

      const result = await service.getWardsByProvinceId(1);

      expect(result).toEqual(mockWards);
      expect(mockWardRepo.find).toHaveBeenCalledWith({
        where: { provinceId: 1 },
        order: { name: 'ASC' },
      });
    });

    it('should return empty array when no wards exist', async () => {
      mockWardRepo.find.mockResolvedValue([]);

      const result = await service.getWardsByProvinceId(999);

      expect(result).toEqual([]);
    });
  });

  describe('getProvinceCenters', () => {
    it('should return array of province centers', () => {
      const result = service.getProvinceCenters();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('provinceCode');
      expect(result[0]).toHaveProperty('lat');
      expect(result[0]).toHaveProperty('lng');
    });

    it('should have valid coordinates', () => {
      const centers = service.getProvinceCenters();

      centers.forEach((center) => {
        expect(typeof center.provinceCode).toBe('number');
        expect(typeof center.lat).toBe('number');
        expect(typeof center.lng).toBe('number');
        expect(center.lat).toBeGreaterThanOrEqual(-90);
        expect(center.lat).toBeLessThanOrEqual(90);
        expect(center.lng).toBeGreaterThanOrEqual(-180);
        expect(center.lng).toBeLessThanOrEqual(180);
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  describe('findUnitByCoordinates', () => {
    const LAT = 10.727;
    const LNG = 106.6988;
    const mockUnit = { id: 1001, provinceId: 2, name: 'Nhà Bè', type: 'DISTRICT' };
    const mockProvince = { id: 2, name: 'TP. Hồ Chí Minh' };

    it('Strategy 1: should return unit when ST_Contains finds a boundary match', async () => {
      // First wardRepo call (ST_Contains) returns a hit
      mockWardRepo.createQueryBuilder.mockReturnValueOnce(createQbMock(mockUnit));

      const result = await service.findUnitByCoordinates(LAT, LNG);

      expect(result).toEqual(mockUnit);
      // provinceRepo should NOT be called — no need to go to strategy 2
      expect(mockProvinceRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('Strategy 2: should resolve correct province first, then find unit within it (cross-province fix)', async () => {
      // ST_Contains miss
      mockWardRepo.createQueryBuilder.mockReturnValueOnce(createQbMock(null));
      // Nearest province → TP.HCM (not Đồng Nai / Bình Dương)
      mockProvinceRepo.createQueryBuilder.mockReturnValueOnce(createQbMock(mockProvince));
      // Nearest unit WITHIN TP.HCM
      mockWardRepo.createQueryBuilder.mockReturnValueOnce(createQbMock(mockUnit));

      const result = await service.findUnitByCoordinates(LAT, LNG);

      expect(result).toEqual(mockUnit);
      expect(result!.provinceId).toBe(2); // phải đúng tỉnh, không bị lạc sang tỉnh khác
    });

    it('Strategy 2: should NOT return a unit from a different province (regression guard)', async () => {
      const wrongProvince = { id: 28, name: 'Tỉnh Đồng Nai' };
      const wrongUnit = { id: 5026, provinceId: 28, name: 'Thủ Dầu Một' };

      mockWardRepo.createQueryBuilder.mockReturnValueOnce(createQbMock(null));
      // nearest province = Đồng Nai (wrong, simulating bad data)
      mockProvinceRepo.createQueryBuilder.mockReturnValueOnce(createQbMock(wrongProvince));
      // unit within Đồng Nai
      mockWardRepo.createQueryBuilder.mockReturnValueOnce(createQbMock(wrongUnit));

      const result = await service.findUnitByCoordinates(LAT, LNG);

      // Result must belong to the nearest province (whatever it is), not jump to another
      expect(result!.provinceId).toBe(wrongProvince.id);
    });

    it('Strategy 3: global fallback when both ST_Contains and province-scoped fail', async () => {
      const globalFallbackUnit = { id: 9999, provinceId: 5, name: 'Đơn vị fallback' };

      mockWardRepo.createQueryBuilder
        .mockReturnValueOnce(createQbMock(null))   // Strategy 1 miss
        .mockReturnValueOnce(createQbMock(null))   // Strategy 2 unit-in-province miss
        .mockReturnValueOnce(createQbMock(globalFallbackUnit)); // Strategy 3

      mockProvinceRepo.createQueryBuilder.mockReturnValueOnce(createQbMock(mockProvince));

      const result = await service.findUnitByCoordinates(LAT, LNG);

      expect(result).toEqual(globalFallbackUnit);
    });

    it('should return null when no unit found at all', async () => {
      mockWardRepo.createQueryBuilder
        .mockReturnValueOnce(createQbMock(null))   // Strategy 1
        .mockReturnValueOnce(createQbMock(null))   // Strategy 2 unit
        .mockReturnValueOnce(createQbMock(null));  // Strategy 3

      mockProvinceRepo.createQueryBuilder.mockReturnValueOnce(createQbMock(mockProvince));

      const result = await service.findUnitByCoordinates(LAT, LNG);

      expect(result).toBeNull();
    });

    it('should return null when no province found and no global unit exists', async () => {
      mockWardRepo.createQueryBuilder
        .mockReturnValueOnce(createQbMock(null))   // Strategy 1
        .mockReturnValueOnce(createQbMock(null));  // Strategy 3 global fallback

      mockProvinceRepo.createQueryBuilder.mockReturnValueOnce(createQbMock(null)); // No province

      const result = await service.findUnitByCoordinates(LAT, LNG);

      expect(result).toBeNull();
    });
  });
});

