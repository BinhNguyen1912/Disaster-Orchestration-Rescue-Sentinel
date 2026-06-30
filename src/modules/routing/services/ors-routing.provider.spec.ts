import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { OrsRoutingProvider, decodePolyline } from './ors-routing.provider';

describe('OrsRoutingProvider', () => {
  let provider: OrsRoutingProvider;
  let configService: ConfigService;
  let fetchSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrsRoutingProvider,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'ORS_API_KEY') return 'test_api_key_12345';
              return null;
            }),
          },
        },
      ],
    }).compile();

    provider = module.get<OrsRoutingProvider>(OrsRoutingProvider);
    configService = module.get<ConfigService>(ConfigService);
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe('decodePolyline (Giải mã Encoded Polyline)', () => {
    it('should decode a simple coordinates polyline correctly (Google example)', () => {
      // Chuỗi nén "_p~iF~ps|U" ứng với tọa độ [38.5, -120.2]
      const encoded = '_p~iF~ps|U';
      const result = decodePolyline(encoded);
      expect(result).toHaveLength(1);
      expect(result[0].latitude).toBeCloseTo(38.5, 5);
      expect(result[0].longitude).toBeCloseTo(-120.2, 5);
    });

    it('should decode multiple sequential coordinate points correctly', () => {
      // Chuỗi nén biểu diễn tọa độ [[38.5, -120.2], [40.53616, -120.2008]]
      const encoded = '_p~iF~ps|U_ulK~e`@';
      const result = decodePolyline(encoded);
      expect(result).toHaveLength(2);
      expect(result[0].latitude).toBeCloseTo(38.5, 5);
      expect(result[0].longitude).toBeCloseTo(-120.2, 5);
      expect(result[1].latitude).toBeCloseTo(40.53616, 5);
      expect(result[1].longitude).toBeCloseTo(-120.37008, 5);
    });
  });

  describe('calculateRoute (Tính toán đường đi tránh ngập)', () => {
    it('should throw BadRequestException if ORS_API_KEY is not configured', async () => {
      // Mock ConfigService trả về null API Key
      jest.spyOn(configService, 'get').mockReturnValue(null);

      const badModule = await Test.createTestingModule({
        providers: [
          OrsRoutingProvider,
          {
            provide: ConfigService,
            useValue: { get: () => null },
          },
        ],
      }).compile();
      const badProvider = badModule.get<OrsRoutingProvider>(OrsRoutingProvider);

      await expect(
        badProvider.calculateRoute(
          { latitude: 16.0, longitude: 108.0 },
          { latitude: 16.1, longitude: 108.1 },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return RouteResult on successful API response with car profile', async () => {
      const mockResponse = {
        routes: [
          {
            geometry: '_p~iF~ps|U',
            summary: {
              distance: 2500, // 2.5 km
              duration: 300, // 5 minutes
            },
          },
        ],
      };

      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as any);

      const result = await provider.calculateRoute(
        { latitude: 16.0, longitude: 108.0 },
        { latitude: 16.1, longitude: 108.1 },
        [],
        'car',
      );

      // Verify fetch call parameters
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.openrouteservice.org/v2/directions/driving-car',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'test_api_key_12345',
          },
        }),
      );

      expect(result.distanceKm).toBe(2.5);
      expect(result.durationMin).toBe(5);
      expect(result.coordinates).toHaveLength(1);
      expect(result.coordinates[0].latitude).toBeCloseTo(38.5, 5);
      expect(result.coordinates[0].longitude).toBeCloseTo(-120.2, 5);
    });

    it('should map foot profile to foot-walking endpoint', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          routes: [
            {
              geometry: '_p~iF~ps|U',
              summary: { distance: 100, duration: 10 },
            },
          ],
        }),
      } as any);

      await provider.calculateRoute(
        { latitude: 16.0, longitude: 108.0 },
        { latitude: 16.1, longitude: 108.1 },
        [],
        'foot',
      );

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.openrouteservice.org/v2/directions/foot-walking',
        expect.any(Object),
      );
    });

    it('should correctly build MultiPolygon options when avoidPolygons are provided', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          routes: [
            {
              geometry: '_p~iF~ps|U',
              summary: { distance: 100, duration: 10 },
            },
          ],
        }),
      } as any);

      const avoidPolygons = [
        {
          type: 'Polygon',
          coordinates: [
            [
              [108.2, 16.05],
              [108.21, 16.05],
              [108.21, 16.06],
              [108.2, 16.06],
              [108.2, 16.05],
            ],
          ],
        },
      ];

      await provider.calculateRoute(
        { latitude: 16.0, longitude: 108.0 },
        { latitude: 16.1, longitude: 108.1 },
        avoidPolygons,
        'car',
      );

      expect(fetchSpy).toHaveBeenCalled();
      const fetchArgs = fetchSpy.mock.calls[0];
      const requestBody = JSON.parse(fetchArgs[1].body);

      expect(requestBody.options).toBeDefined();
      expect(requestBody.options.avoid_polygons).toBeDefined();
      expect(requestBody.options.avoid_polygons.type).toBe('MultiPolygon');
      expect(requestBody.options.avoid_polygons.coordinates).toHaveLength(1);
      expect(requestBody.options.avoid_polygons.coordinates[0][0][0]).toEqual([
        108.2, 16.05,
      ]);
    });

    it('should throw BadRequestException if ORS response is not ok (e.g. status 400)', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => 'Point is not within the routing network',
      } as any);

      await expect(
        provider.calculateRoute(
          { latitude: 16.0, longitude: 108.0 },
          { latitude: 16.1, longitude: 108.1 },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if ORS returns ok status but empty routes list', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({ routes: [] }),
      } as any);

      await expect(
        provider.calculateRoute(
          { latitude: 16.0, longitude: 108.0 },
          { latitude: 16.1, longitude: 108.1 },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
