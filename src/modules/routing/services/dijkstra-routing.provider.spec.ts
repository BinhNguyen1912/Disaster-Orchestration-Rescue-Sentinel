import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import {
  DijkstraRoutingProvider,
  isPointInPolygon,
  isSegmentIntersecting,
  getPolygonLatLns,
  isEdgeBlocked,
} from './dijkstra-routing.provider';

describe('DijkstraRoutingProvider', () => {
  let provider: DijkstraRoutingProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DijkstraRoutingProvider],
    }).compile();

    provider = module.get<DijkstraRoutingProvider>(DijkstraRoutingProvider);
  });

  describe('Hình học cơ sở (Geometry Helpers)', () => {
    it('isPointInPolygon should detect if point is inside polygon boundary', () => {
      const polygon: [number, number][] = [
        [10.0, 10.0],
        [20.0, 10.0],
        [20.0, 20.0],
        [10.0, 20.0],
        [10.0, 10.0], // Đóng vòng
      ];

      expect(isPointInPolygon([15.0, 15.0], polygon)).toBe(true); // Ở giữa
      expect(isPointInPolygon([5.0, 5.0], polygon)).toBe(false); // Bên ngoài
      expect(isPointInPolygon([25.0, 15.0], polygon)).toBe(false); // Bên phải
    });

    it('isSegmentIntersecting should detect if two line segments cross each other', () => {
      // Đoạn thẳng AB và CD cắt nhau hình chữ X
      const a: [number, number] = [0, 0];
      const b: [number, number] = [2, 2];
      const c: [number, number] = [0, 2];
      const d: [number, number] = [2, 0];
      expect(isSegmentIntersecting(a, b, c, d)).toBe(true);

      // Đoạn thẳng AB và CD song song không giao cắt
      const c2: [number, number] = [0, 1];
      const d2: [number, number] = [2, 3];
      expect(isSegmentIntersecting(a, b, c2, d2)).toBe(false);
    });

    it('getPolygonLatLns should map GeoJSON [lng, lat] to Leaflet [lat, lng]', () => {
      const geojsonFeature = {
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
      };

      const result = getPolygonLatLns(geojsonFeature);
      expect(result).toHaveLength(5);
      // Điểm đầu tiên: GeoJSON [108.20, 16.05] -> Mapped [16.05, 108.20]
      expect(result[0]).toEqual([16.05, 108.2]);
    });

    it('isEdgeBlocked should return true if any point of edge resides in polygon', () => {
      const edgeGeom: [number, number][] = [
        [16.0544, 108.2022],
        [16.055, 108.203],
      ];
      // Vùng ngập bao trọn điểm thứ 2
      const polygon: [number, number][] = [
        [16.0549, 108.2028],
        [16.056, 108.2028],
        [16.056, 108.204],
        [16.0549, 108.204],
        [16.0549, 108.2028],
      ];

      expect(isEdgeBlocked(edgeGeom, polygon)).toBe(true);
    });

    it('isEdgeBlocked should return true if edge segment crosses polygon boundary', () => {
      // Đoạn thẳng đi từ ngoài vào trong rồi đi ra ngoài
      const edgeGeom: [number, number][] = [
        [16.05, 108.2],
        [16.06, 108.2],
      ];
      // Vùng ngập nằm chắn giữa
      const polygon: [number, number][] = [
        [16.053, 108.199],
        [16.057, 108.199],
        [16.057, 108.201],
        [16.053, 108.201],
        [16.053, 108.199],
      ];

      expect(isEdgeBlocked(edgeGeom, polygon)).toBe(true);
    });
  });

  describe('Dijkstra Pathfinding', () => {
    it('should calculate shortest route successfully when no flood zones exist', async () => {
      // Đi từ Cổng Sân Bay (n13: ~16.055, 108.1855) sang Đuôi Cầu Rồng phía Tây (n1: ~16.0544, 108.2022)
      // Theo đồ thị: có kết nối trực tiếp bằng Edge e11 dài 1.6km
      const result = await provider.calculateRoute(
        { latitude: 16.055, longitude: 108.1855 },
        { latitude: 16.0544, longitude: 108.2022 },
        [],
      );

      expect(result.distanceKm).toBeCloseTo(1.6, 2);
      expect(result.durationMin).toBeCloseTo(3.2, 2); // 1.6km / 30km/h * 60 = 3.2 phút
      expect(result.coordinates.length).toBeGreaterThan(1);
    });

    it('should dynamically route around flood zones by disabling blocked edges', async () => {
      // Tìm đường từ Cổng Sân Bay (n13) sang Cầu Sông Hàn phía Đông (n5: ~16.068, 108.230)
      // Thông thường: đi n13 -> n1 (e11) -> n2 (e1) -> n5 (e4)
      // Ta đặt 1 vùng ngập bao vây lấy nút giao n1 (Nguyễn Văn Linh - Bạch Đằng)
      const floodZones = [
        {
          type: 'Polygon',
          coordinates: [
            [
              [108.198, 16.05],
              [108.208, 16.05],
              [108.208, 16.058],
              [108.198, 16.058],
              [108.198, 16.05],
            ],
          ],
        },
      ];

      const result = await provider.calculateRoute(
        { latitude: 16.055, longitude: 108.1855 }, // n13
        { latitude: 16.068, longitude: 108.23 }, // n5
        floodZones,
      );

      // Vì n1 bị chặn đứng, Dijkstra phải đi đường vòng phía bắc:
      // n13 -> n14 (e12) -> n7 (e14) -> n2 (e1)? Không, n2 kề với e1 (n1-n2) đã bị chặn một phần,
      // nhưng e4 (n2-n5) và e14 (n14-n7) vẫn mở. Node n2 vẫn được nối từ n7 (e14 kết nối n14-n7).
      // Kiểm tra xem khoảng cách có tăng lên (đường vòng dài hơn đường thẳng thông thường)
      expect(result.distanceKm).toBeGreaterThan(2.5);
      expect(result.coordinates).toBeDefined();
    });

    it('should throw BadRequestException with custom rescue warning if target is isolated by floods', async () => {
      // Đặt một đa giác lớn bao phủ toàn bộ khu vực Sân bay n13, cô lập điểm xuất phát
      const giantFlood = [
        {
          type: 'Polygon',
          coordinates: [
            [
              [108.18, 16.04],
              [108.192, 16.04],
              [108.192, 16.07],
              [108.18, 16.07],
              [108.18, 16.04],
            ],
          ],
        },
      ];

      await expect(
        provider.calculateRoute(
          { latitude: 16.055, longitude: 108.1855 }, // n13 (bên trong vùng ngập)
          { latitude: 16.068, longitude: 108.23 }, // n5 (bên ngoài)
          giantFlood,
        ),
      ).rejects.toThrow(
        new BadRequestException(
          'Hiện trường bị cô lập hoàn toàn bằng đường bộ. Đề xuất điều hướng bằng phương tiện thủy (xuồng, ca-nô).',
        ),
      );
    });
  });
});
