import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IRoutingProvider,
  RouteCoordinates,
  RouteResult,
} from '../interfaces/routing-provider.interface';

// Tự lập trình giải mã chuỗi Encoded Polyline để không cần phụ thuộc thư viện ngoài
export function decodePolyline(encoded: string): RouteCoordinates[] {
  const points: RouteCoordinates[] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return points;
}

@Injectable()
export class OrsRoutingProvider implements IRoutingProvider {
  private readonly logger = new Logger(OrsRoutingProvider.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.openrouteservice.org/v2/directions';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('ORS_API_KEY') || '';
  }

  async calculateRoute(
    start: RouteCoordinates,
    end: RouteCoordinates,
    avoidPolygons?: any[],
    profile: 'car' | 'foot' | 'boat' = 'car',
  ): Promise<RouteResult> {
    if (!this.apiKey) {
      this.logger.error(
        'ORS_API_KEY is not configured in environment variables',
      );
      throw new BadRequestException(
        'OpenRouteService API Key chưa được cấu hình.',
      );
    }

    // Ánh xạ các profile cứu hộ sang endpoint tương ứng của ORS
    let orsProfile = 'driving-car';
    if (profile === 'foot') {
      orsProfile = 'foot-walking';
    } else if (profile === 'boat') {
      // Vì ORS không có chỉ đường thủy công cộng, ta tạm thời fallback về foot-walking
      // và ghi chú đây là phần mô phỏng chạy thử nghiệm
      this.logger.warn(
        'Profile boat is not supported natively by ORS, falling back to foot-walking for demo',
      );
      orsProfile = 'foot-walking';
    }

    const url = `${this.baseUrl}/${orsProfile}`;

    // Cấu trúc request body hỗ trợ truyền đa giác vùng ngập lụt
    const body: any = {
      coordinates: [
        [start.longitude, start.latitude],
        [end.longitude, end.latitude],
      ],
    };

    // Nếu có đa giác vùng ngập, chuyển đổi sang định dạng MultiPolygon của ORS
    if (avoidPolygons && avoidPolygons.length > 0) {
      const polygonsCoordinates: any[] = [];
      avoidPolygons.forEach((poly: any) => {
        if (poly.geometry && poly.geometry.type === 'Polygon') {
          polygonsCoordinates.push(poly.geometry.coordinates);
        } else if (poly.type === 'Polygon' && poly.coordinates) {
          polygonsCoordinates.push(poly.coordinates);
        } else if (Array.isArray(poly)) {
          polygonsCoordinates.push(poly);
        }
      });

      if (polygonsCoordinates.length > 0) {
        body.options = {
          avoid_polygons: {
            type: 'MultiPolygon',
            coordinates: polygonsCoordinates,
          },
        };
      }
    }

    try {
      this.logger.log(
        `Requesting route from ORS [${orsProfile}] starting at [${start.latitude}, ${start.longitude}]`,
      );
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.apiKey,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `ORS API error status: ${response.status}. Detail: ${errorText}`,
        );
        throw new BadRequestException(
          `Lỗi từ dịch vụ định tuyến ORS: ${response.statusText}`,
        );
      }

      const data = await response.json();
      if (!data.routes || data.routes.length === 0) {
        throw new BadRequestException('Không tìm thấy tuyến đường đi khả thi.');
      }

      const route = data.routes[0];
      const encodedGeometry = route.geometry;
      const summary = route.summary;

      // Giải mã chuỗi polyline nhận từ ORS
      const coordinates = decodePolyline(encodedGeometry);
      const distanceKm = summary.distance / 1000; // Đổi mét sang km
      const durationMin = summary.duration / 60; // Đổi giây sang phút

      return {
        coordinates,
        distanceKm,
        durationMin,
      };
    } catch (err) {
      this.logger.error(
        'Failed to calculate route from OpenRouteService',
        err.stack,
      );
      throw new BadRequestException(
        err.message || 'Lỗi hệ thống khi tính toán tuyến đường tránh ngập lụt.',
      );
    }
  }
}
