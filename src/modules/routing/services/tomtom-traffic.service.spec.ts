import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TomTomTrafficService } from './tomtom-traffic.service';

describe('TomTomTrafficService', () => {
  let service: TomTomTrafficService;
  let mockConfigService: any;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'TOMTOM_ROUTING_URL') return 'https://api.tomtom.com/routing/1/calculateRoute';
        if (key === 'TOMTOM_API_KEY') return 'test-key';
        if (key === 'TOMTOM_TRAFFIC_ENABLED') return true;
        if (key === 'TOMTOM_CACHE_TTL_SECONDS') return 240;
        return defaultValue;
      }),
    };
  });

  const createService = async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TomTomTrafficService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<TomTomTrafficService>(TomTomTrafficService);
  };

  it('should return baseline if TOMTOM_TRAFFIC_ENABLED is false (Optional check)', async () => {
    mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
      if (key === 'TOMTOM_TRAFFIC_ENABLED') return false;
      if (key === 'TOMTOM_API_KEY') return 'test-key';
      return defaultValue;
    });

    await createService();

    const start = { latitude: 10.0, longitude: 106.0 };
    const end = { latitude: 10.01, longitude: 106.01 };
    
    const result = await service.getTrafficData(start, end, 300, 5000);
    expect(result.travelTimeInSeconds).toBe(300);
    expect(result.trafficDelayInSeconds).toBe(0);
    expect(result.lengthInMeters).toBe(5000);
    expect(result.trafficFactor).toBe(1.0);
  });

  it('should return baseline if API key is missing', async () => {
    mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
      if (key === 'TOMTOM_API_KEY') return '';
      if (key === 'TOMTOM_TRAFFIC_ENABLED') return true;
      return defaultValue;
    });

    await createService();

    const start = { latitude: 10.0, longitude: 106.0 };
    const end = { latitude: 10.01, longitude: 106.01 };
    
    const result = await service.getTrafficData(start, end, 300, 5000);
    expect(result.trafficFactor).toBe(1.0);
  });

  it('should calculate traffic factor correctly under normal conditions (Happy Path)', async () => {
    await createService();

    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        routes: [
          {
            summary: {
              travelTimeInSeconds: 360,
              trafficDelayInSeconds: 60,
              lengthInMeters: 5200,
            },
          },
        ],
      }),
    };

    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    const start = { latitude: 10.0, longitude: 106.0 };
    const end = { latitude: 10.01, longitude: 106.01 };
    
    const result = await service.getTrafficData(start, end, 300, 5000);
    
    // travelTime = 360, trafficDelay = 60 => idealTime = 300
    // factor = 360 / 300 = 1.2
    expect(result.travelTimeInSeconds).toBe(360);
    expect(result.trafficDelayInSeconds).toBe(60);
    expect(result.lengthInMeters).toBe(5200);
    expect(result.trafficFactor).toBe(1.2);
  });

  it('should clamp traffic factor to 5.0 if calculated value is too high', async () => {
    await createService();

    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        routes: [
          {
            summary: {
              travelTimeInSeconds: 300,
              trafficDelayInSeconds: 250, // ideal time = 50s => factor = 300 / 50 = 6.0
              lengthInMeters: 5200,
            },
          },
        ],
      }),
    };

    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    const start = { latitude: 10.0, longitude: 106.0 };
    const end = { latitude: 10.01, longitude: 106.01 };
    
    const result = await service.getTrafficData(start, end, 300, 5000);
    expect(result.trafficFactor).toBe(5.0); // Clamped to 5.0
  });

  it('should clamp traffic factor to 1.0 if trafficDelayInSeconds >= travelTimeInSeconds', async () => {
    await createService();

    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        routes: [
          {
            summary: {
              travelTimeInSeconds: 300,
              trafficDelayInSeconds: 360, // Delay is greater than travel time (data error)
              lengthInMeters: 5200,
            },
          },
        ],
      }),
    };

    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    const start = { latitude: 10.0, longitude: 106.0 };
    const end = { latitude: 10.01, longitude: 106.01 };
    
    const result = await service.getTrafficData(start, end, 300, 5000);
    expect(result.trafficFactor).toBe(1.0); // Reset to 1.0 (clamped fallback)
  });

  it('should fallback gracefully to baseline and log API limits if response is not ok (429/500)', async () => {
    await createService();

    const mockResponse = {
      ok: false,
      status: 429,
    };

    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    const start = { latitude: 10.0, longitude: 106.0 };
    const end = { latitude: 10.01, longitude: 106.01 };
    
    const result = await service.getTrafficData(start, end, 300, 5000);
    expect(result.travelTimeInSeconds).toBe(300);
    expect(result.trafficFactor).toBe(1.0);
  });
});
