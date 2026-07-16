import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IRoutingProvider,
  RouteCoordinates,
  RouteResult,
} from '../interfaces/routing-provider.interface';
import * as crypto from 'crypto';

interface RouteCacheEntry {
  result: RouteResult;
  expiresAt: number;
}

@Injectable()
export class TomTomRoutingProvider implements IRoutingProvider {
  private readonly logger = new Logger(TomTomRoutingProvider.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.tomtom.com/routing/1/calculateRoute';

  // === Cache ===
  // Key: md5(start+end+profile+avoidCount), Value: RouteResult + expiresAt
  private readonly routeCache = new Map<string, RouteCacheEntry>();
  private readonly cacheTtlMs: number;

  // === Daily Call Counter ===
  private dailyCallCount = 0;
  private currentUtcDay = '';
  private readonly dailyLimit: number;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('TOMTOM_API_KEY') || '';

    // Thời gian cache tuyến đường: mặc định 6 giờ
    const cacheTtlHours = Number(
      this.configService.get<number>('TOMTOM_ROUTING_CACHE_TTL_HOURS') || 6,
    );
    this.cacheTtlMs = cacheTtlHours * 60 * 60 * 1000;

    // Giới hạn gọi API tối đa mỗi ngày: mặc định 100 (an toàn khi test)
    this.dailyLimit = Number(
      this.configService.get<number>('TOMTOM_ROUTING_DAILY_LIMIT') || 100,
    );

    this.logger.log(
      `TomTomRoutingProvider initialized — cache TTL: ${cacheTtlHours}h, daily limit: ${this.dailyLimit} calls/day`,
    );
  }

  /** Tạo cache key từ tọa độ + profile (làm tròn 4 chữ số thập phân ~11m precision) */
  private buildCacheKey(
    start: RouteCoordinates,
    end: RouteCoordinates,
    profile: string,
    avoidCount: number,
  ): string {
    const raw = [
      start.latitude.toFixed(4),
      start.longitude.toFixed(4),
      end.latitude.toFixed(4),
      end.longitude.toFixed(4),
      profile,
      avoidCount,
    ].join(':');
    return crypto.createHash('md5').update(raw).digest('hex');
  }

  /** Kiểm tra và tăng bộ đếm gọi API theo ngày UTC — ném lỗi nếu vượt giới hạn */
  private checkDailyLimit(): void {
    const now = new Date();
    const todayUtc = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}`;

    if (this.currentUtcDay !== todayUtc) {
      this.currentUtcDay = todayUtc;
      this.dailyCallCount = 0;
      this.logger.log(`[TomTom Routing] New UTC day (${todayUtc}), daily counter reset.`);
    }

    this.dailyCallCount++;
    this.logger.log(
      `[TomTom Routing] API call #${this.dailyCallCount}/${this.dailyLimit} today`,
    );

    if (this.dailyCallCount > this.dailyLimit) {
      this.logger.warn(
        `[TomTom Routing] Daily limit reached (${this.dailyLimit} calls). Triggering Dijkstra fallback.`,
      );
      throw new BadRequestException(
        `TomTom Routing: đã đạt giới hạn ${this.dailyLimit} lần gọi/ngày. Chuyển sang định tuyến Dijkstra offline.`,
      );
    }

    if (this.dailyCallCount >= Math.floor(this.dailyLimit * 0.8)) {
      this.logger.warn(
        `[TomTom Routing] WARNING: ${this.dailyCallCount}/${this.dailyLimit} calls used today (≥80% threshold).`,
      );
    }
  }

  async calculateRoute(
    start: RouteCoordinates,
    end: RouteCoordinates,
    avoidPolygons?: any[],
    profile: 'car' | 'foot' | 'boat' = 'car',
  ): Promise<RouteResult> {
    if (!this.apiKey) {
      this.logger.error('TOMTOM_API_KEY is not configured in environment variables');
      throw new BadRequestException('TomTom API Key chưa được cấu hình.');
    }

    const avoidCount = avoidPolygons?.length || 0;

    // === 1. Cache check — nếu trúng thì trả về ngay, không tốn quota ===
    const cacheKey = this.buildCacheKey(start, end, profile, avoidCount);
    const cached = this.routeCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      this.logger.log(
        `[TomTom Routing] Cache HIT (${cacheKey.slice(0, 8)}...) — skipping API call`,
      );
      return cached.result;
    }

    // === 2. Kiểm tra giới hạn gọi API hàng ngày — ném lỗi để controller fallback Dijkstra ===
    this.checkDailyLimit();

    // Map profile to TomTom travel mode
    const travelMode =
      profile === 'foot' ? 'pedestrian' :
      profile === 'boat' ? 'ferry' :
      'car';

    const routeCoords = `${start.latitude},${start.longitude}:${end.latitude},${end.longitude}`;

    const params = new URLSearchParams({
      key: this.apiKey,
      travelMode,
      traffic: 'false',
      routeType: 'fastest',
      instructionsType: 'none',
      maxAlternatives: '0',
    });

    let data: any;

    if (avoidCount > 0) {
      // POST request với avoidAreas body khi có vùng ngập lụt
      const url = `${this.baseUrl}/${routeCoords}/json?${params.toString()}`;
      const avoidAreas = this._buildAvoidAreas(avoidPolygons!);
      const body: any = avoidAreas.length > 0
        ? { avoidAreas: { rectangles: [], polygons: avoidAreas } }
        : {};

      this.logger.log(
        `[TomTom Routing] POST [${travelMode}] ${start.latitude},${start.longitude} → ${end.latitude},${end.longitude} (${avoidAreas.length} avoid zones)`,
      );

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`TomTom API error ${response.status}: ${errorText}`);
        throw new BadRequestException(`TomTom Routing: HTTP ${response.status}`);
      }
      data = await response.json();
    } else {
      // GET request thông thường
      const url = `${this.baseUrl}/${routeCoords}/json?${params.toString()}`;
      this.logger.log(
        `[TomTom Routing] GET [${travelMode}] ${start.latitude},${start.longitude} → ${end.latitude},${end.longitude}`,
      );

      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`TomTom API error ${response.status}: ${errorText}`);
        throw new BadRequestException(`TomTom Routing: HTTP ${response.status}`);
      }
      data = await response.json();
    }

    if (!data.routes || data.routes.length === 0) {
      throw new BadRequestException('TomTom không tìm thấy tuyến đường khả thi.');
    }

    const route = data.routes[0];
    const summary = route.summary;

    // TomTom trả về tọa độ chi tiết từ legs[].points[]
    const coordinates: RouteCoordinates[] = [];
    for (const leg of route.legs || []) {
      for (const point of leg.points || []) {
        coordinates.push({
          latitude: point.latitude,
          longitude: point.longitude,
        });
      }
    }

    if (coordinates.length === 0) {
      throw new BadRequestException('TomTom trả về tuyến đường không có tọa độ hợp lệ.');
    }

    const distanceKm = (summary.lengthInMeters || 0) / 1000;
    const durationMin = (summary.travelTimeInSeconds || 0) / 60;

    this.logger.log(
      `[TomTom Routing] Route found: ${distanceKm.toFixed(2)} km, ${durationMin.toFixed(1)} min, ${coordinates.length} waypoints`,
    );

    const result: RouteResult = { coordinates, distanceKm, durationMin };

    // === 3. Lưu vào cache ===
    this.routeCache.set(cacheKey, {
      result,
      expiresAt: Date.now() + this.cacheTtlMs,
    });

    return result;
  }

  /**
   * Chuyển đổi GeoJSON polygon features sang định dạng avoidAreas.polygons của TomTom
   * TomTom format: { vertices: [{latitude, longitude}] }[]
   */
  private _buildAvoidAreas(
    avoidPolygons: any[],
  ): { vertices: { latitude: number; longitude: number }[] }[] {
    const result: { vertices: { latitude: number; longitude: number }[] }[] = [];

    for (const poly of avoidPolygons) {
      let coords: [number, number][] | null = null;

      if (poly.geometry?.type === 'Polygon') {
        coords = poly.geometry.coordinates[0]; // GeoJSON: [lng, lat]
      } else if (poly.type === 'Polygon' && poly.coordinates) {
        coords = poly.coordinates[0];
      }

      if (!coords || coords.length < 3) continue;

      const vertices = coords.map(([lng, lat]: [number, number]) => ({
        latitude: lat,
        longitude: lng,
      }));

      result.push({ vertices });
    }

    return result;
  }
}
