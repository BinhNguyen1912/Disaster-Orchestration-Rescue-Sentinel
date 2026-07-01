import { Test, TestingModule } from '@nestjs/testing';
import { RoutingController, CalculateRouteDto } from './routing.controller';
import { DijkstraRoutingProvider } from '../../services/dijkstra-routing.provider';
import { BadRequestException } from '@nestjs/common';

describe('RoutingController', () => {
  let controller: RoutingController;
  let mockOrsRoutingProvider: any;
  let mockDijkstraRoutingProvider: any;

  beforeEach(async () => {
    mockOrsRoutingProvider = {
      calculateRoute: jest.fn().mockResolvedValue({
        coordinates: [{ latitude: 10.0, longitude: 106.0 }],
        distanceKm: 5,
        durationMin: 10,
      }),
    };

    mockDijkstraRoutingProvider = {
      calculateRoute: jest.fn().mockResolvedValue({
        coordinates: [{ latitude: 10.0, longitude: 106.0 }],
        distanceKm: 4.8,
        durationMin: 9.6,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoutingController],
      providers: [
        {
          provide: 'IRoutingProvider',
          useValue: mockOrsRoutingProvider,
        },
        {
          provide: DijkstraRoutingProvider,
          useValue: mockDijkstraRoutingProvider,
        },
      ],
    }).compile();

    controller = module.get<RoutingController>(RoutingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('calculateRoute', () => {
    const dto: CalculateRouteDto = {
      start: { latitude: 10.0, longitude: 106.0 },
      end: { latitude: 10.01, longitude: 106.01 },
      avoidPolygons: [],
      profile: 'car',
    };

    it('should return primary route, dijkstra route = null and isIsolated = false', async () => {
      const response = await controller.calculateRoute(dto);

      expect(response.success).toBe(true);
      expect(response.data.primary).toBeDefined();
      expect(response.data.dijkstra).toBeNull();
      expect(response.data.isIsolated).toBe(false);

      expect(mockOrsRoutingProvider.calculateRoute).toHaveBeenCalled();
    });

    it('should set isIsolated = true when route with avoidPolygons fails but route without avoidPolygons succeeds', async () => {
      // First call (with avoidPolygons) fails
      mockOrsRoutingProvider.calculateRoute.mockRejectedValueOnce(
        new BadRequestException('Không tìm thấy đường tránh ngập.'),
      );
      // Second call (without avoidPolygons) succeeds
      mockOrsRoutingProvider.calculateRoute.mockResolvedValueOnce({
        coordinates: [{ latitude: 10.0, longitude: 106.0 }],
        distanceKm: 5,
        durationMin: 10,
      });

      const response = await controller.calculateRoute(dto);

      expect(response.success).toBe(true);
      expect(response.data.primary).toBeDefined();
      expect(response.data.dijkstra).toBeNull();
      expect(response.data.isIsolated).toBe(true);
    });
  });
});
