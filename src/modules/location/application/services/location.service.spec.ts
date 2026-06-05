import { Test, TestingModule } from '@nestjs/testing';
import { LocationService } from './location.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProvinceEntity } from '@infrastructure/database/entities/province.entity';
import { AdministrativeUnitEntity } from '@infrastructure/database/entities/administrative-unit.entity';

describe('LocationService', () => {
  let service: LocationService;

  const mockProvinceRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockWardRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
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
      expect(mockProvinceRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
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
});