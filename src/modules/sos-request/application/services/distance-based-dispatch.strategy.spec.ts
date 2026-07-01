import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DistanceBasedDispatchStrategy } from './distance-based-dispatch.strategy';
import { SosRequest } from '../../domain/entities/sos-request.entity';
import { SosRequestType } from '@shared/core/enums/sosType.enum';
import { Severity } from '@shared/core/enums/level.enum';
import { SosStatus } from '@shared/core/enums/sosStatus.enum';
import { SosSource } from '@shared/core/enums/sosSource.enum';
import { TeamStatus } from '@shared/core/enums/teamStatus.enum';
import { TeamType } from '@shared/core/enums/teamType.enum';
import { SystemSettingService } from '../../../system-setting/application/services/system-setting.service';
import { FloodZoneEntity } from '@infrastructure/database/entities/flood-zone.entity';
import { TomTomTrafficService } from '../../../routing/services/tomtom-traffic.service';

describe('DistanceBasedDispatchStrategy', () => {
  let strategy: DistanceBasedDispatchStrategy;

  const mockTeamRepo = {
    findNearestAvailable: jest.fn(),
    findAvailableTeamsInRadius: jest.fn(),
  };

  const mockSystemSettingService = {
    getAllSettings: jest.fn(),
  };

  const mockRoutingProvider = {
    calculateRoute: jest.fn().mockResolvedValue({
      distanceKm: 5,
      durationMin: 10,
    }),
  };

  const mockTomTomTrafficService = {
    getTrafficData: jest.fn().mockResolvedValue({
      travelTimeInSeconds: 600,
      trafficDelayInSeconds: 120,
      lengthInMeters: 5000,
      trafficFactor: 1.2,
    }),
  };

  const mockFloodZoneRepo = {
    find: jest.fn().mockResolvedValue([]),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      if (key === 'TOMTOM_MAX_CANDIDATES') return 3;
      if (key === 'TOMTOM_TRAFFIC_ENABLED') return true;
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DistanceBasedDispatchStrategy,
        { provide: 'IRescueTeamRepository', useValue: mockTeamRepo },
        { provide: SystemSettingService, useValue: mockSystemSettingService },
        { provide: 'IRoutingProvider', useValue: mockRoutingProvider },
        { provide: TomTomTrafficService, useValue: mockTomTomTrafficService },
        { provide: getRepositoryToken(FloodZoneEntity), useValue: mockFloodZoneRepo },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    strategy = module.get<DistanceBasedDispatchStrategy>(
      DistanceBasedDispatchStrategy,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const sampleSos: SosRequest = {
    id: 1,
    provinceId: 1,
    adminUnitId: 12,
    requestType: SosRequestType.FLOOD,
    status: SosStatus.PENDING,
    severity: Severity.HIGH,
    trappedPeopleCount: 2,
    imageUrls: [],
    source: SosSource.WEB,
    createdAt: new Date(),
    updatedAt: new Date(),
    location: {
      type: 'Point',
      coordinates: [106.7004, 10.7589], // [longitude, latitude]
    },
  };

  it('should return null if SOS request has no coordinates', async () => {
    const invalidSos = { ...sampleSos, location: undefined };
    const result = await strategy.assignTeam(invalidSos as any);
    expect(result).toBeNull();
  });

  it('should find team in the first radius (5000m) and assign it', async () => {
    // Mock settings
    mockSystemSettingService.getAllSettings.mockResolvedValue({
      'dispatch.radius_steps': '5000,10000,20000',
      'dispatch.weight_distance': '0.5',
      'dispatch.weight_active_cases': '0.3',
      'dispatch.weight_skill_mismatch': '0.2',
    });

    // Mock team repo response for 5000m
    mockTeamRepo.findAvailableTeamsInRadius.mockImplementation(
      (lat, lng, radius, provinceId) => {
        if (radius === 5000) {
          return Promise.resolve([
            {
              id: 10,
              name: 'Đội Dân Phòng A',
              teamType: TeamType.DAN_PHONG,
              status: TeamStatus.AVAILABLE,
              activeCasesCount: 0,
              distance_meters: 1000, // 1km
            },
          ]);
        }
        return Promise.resolve([]);
      },
    );

    const result = await strategy.assignTeam(sampleSos);
    expect(result?.bestTeamId).toBe(10);
    expect(mockTeamRepo.findAvailableTeamsInRadius).toHaveBeenCalledWith(
      10.7589,
      106.7004,
      5000,
      1,
    );
  });

  it('should expand to the second radius (10000m) if first radius (5000m) has no teams', async () => {
    mockSystemSettingService.getAllSettings.mockResolvedValue({
      'dispatch.radius_steps': '5000,10000,20000',
    });

    mockTeamRepo.findAvailableTeamsInRadius.mockImplementation(
      (lat, lng, radius, provinceId) => {
        if (radius === 5000) {
          return Promise.resolve([]);
        }
        if (radius === 10000) {
          return Promise.resolve([
            {
              id: 20,
              name: 'Đội Quân Sự B',
              teamType: TeamType.QUAN_SU,
              status: TeamStatus.AVAILABLE,
              activeCasesCount: 1,
              distance_meters: 8000, // 8km
            },
          ]);
        }
        return Promise.resolve([]);
      },
    );

    const result = await strategy.assignTeam(sampleSos);
    expect(result?.bestTeamId).toBe(20);
    expect(mockTeamRepo.findAvailableTeamsInRadius).toHaveBeenCalledTimes(2);
  });

  it('should select team with the best (lowest) score based on distance, cases, and skill mapping', async () => {
    mockSystemSettingService.getAllSettings.mockResolvedValue({
      'dispatch.radius_steps': '10000',
      'dispatch.weight_distance': '0.5',
      'dispatch.weight_active_cases': '0.3',
      'dispatch.weight_skill_mismatch': '0.2',
      'dispatch.skill_mapping': JSON.stringify({
        FLOOD: ['DAN_PHONG', 'QUAN_SU', 'TONG_HOP'],
      }),
    });

    // Team 1: Near, but has 4 cases, correct type
    // Team 2: Far, 0 cases, correct type
    // Team 3: Near, 0 cases, wrong type (e.g. Y_TE is not in ['DAN_PHONG', 'QUAN_SU', 'TONG_HOP'] for FLOOD)
    const mockTeams = [
      {
        id: 1,
        name: 'Team 1',
        teamType: TeamType.DAN_PHONG,
        activeCasesCount: 4,
        distance_meters: 1000, // 1km
      },
      {
        id: 2,
        name: 'Team 2',
        teamType: TeamType.DAN_PHONG,
        activeCasesCount: 0,
        distance_meters: 8000, // 8km
      },
      {
        id: 3,
        name: 'Team 3',
        teamType: TeamType.Y_TE,
        activeCasesCount: 0,
        distance_meters: 1000, // 1km
      },
    ];

    mockTeamRepo.findAvailableTeamsInRadius.mockResolvedValue(mockTeams);

    // Let's compute manual scores to check which is lowest:
    // Radius = 10000m
    // Team 1:
    //   distance_norm = 1000 / 10000 = 0.1
    //   active_cases_norm = 4 / 5 = 0.8
    //   skill_mismatch_norm = 0 (DAN_PHONG matches FLOOD)
    //   Score = 0.1 * 0.5 + 0.8 * 0.3 + 0 * 0.2 = 0.05 + 0.24 = 0.29
    // Team 2:
    //   distance_norm = 8000 / 10000 = 0.8
    //   active_cases_norm = 0
    //   skill_mismatch_norm = 0
    //   Score = 0.8 * 0.5 + 0 * 0.3 + 0 * 0.2 = 0.40
    // Team 3:
    //   distance_norm = 1000 / 10000 = 0.1
    //   active_cases_norm = 0
    //   skill_mismatch_norm = 1 (Y_TE does not match FLOOD)
    //   Score = 0.1 * 0.5 + 0 * 0.3 + 1 * 0.2 = 0.05 + 0.2 = 0.25
    //
    // Lowest score is Team 3 (0.25) -> then Team 1 (0.29) -> then Team 2 (0.40)
    // So Team 3 should be selected!
    const result = await strategy.assignTeam(sampleSos);
    expect(result?.bestTeamId).toBe(3);
  });

  it('should return null if no available teams are found in any radius', async () => {
    mockSystemSettingService.getAllSettings.mockResolvedValue({
      'dispatch.radius_steps': '5000,10000',
    });
    mockTeamRepo.findAvailableTeamsInRadius.mockResolvedValue([]);

    const result = await strategy.assignTeam(sampleSos);
    expect(result).toBeNull();
  });
});
