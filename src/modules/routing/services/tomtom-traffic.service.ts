import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface TrafficResult {
  travelTimeInSeconds: number;
  trafficDelayInSeconds: number;
  lengthInMeters: number;
  trafficFactor: number;
}

interface CacheEntry extends TrafficResult {
  expiresAt: number;
}

@Injectable()
export class TomTomTrafficService {
  private readonly logger = new Logger(TomTomTrafficService.name);
  private readonly tomtomRoutingUrl: string;
  private readonly apiKey: string;
  private readonly isEnabled: boolean;
  private readonly cacheTtl: number;

  // In-memory cache for coordinates
  private readonly cache = new Map<string, CacheEntry>();

  // In-memory daily counter matching TomTom UTC reset
  private apiCallCount = 0;
  private currentUtcDay = '';

  constructor(private readonly configService: ConfigService) {
    this.tomtomRoutingUrl = this.configService.get<string>('TOMTOM_ROUTING_URL') || 'https://api.tomtom.com/routing/1/calculateRoute';
    this.apiKey = this.configService.get<string>('TOMTOM_API_KEY') || '';
    this.isEnabled = this.configService.get<boolean>('TOMTOM_TRAFFIC_ENABLED', true);
    this.cacheTtl = Number(this.configService.get<number>('TOMTOM_CACHE_TTL_SECONDS') || 240);
  }

  async getTrafficData(
    start: { latitude: number; longitude: number },
    end: { latitude: number; longitude: number },
    baselineDurationSeconds: number,
    baselineDistanceMeters: number,
  ): Promise<TrafficResult> {
    const fallbackResult: TrafficResult = {
      travelTimeInSeconds: baselineDurationSeconds,
      trafficDelayInSeconds: 0,
      lengthInMeters: baselineDistanceMeters,
      trafficFactor: 1.0,
    };

    if (!this.isEnabled) {
      return fallbackResult;
    }

    if (!this.apiKey) {
      this.logger.warn('TomTom Traffic API key is not configured, falling back to baseline.');
      return fallbackResult;
    }

    // 1. Check in-memory cache (round coordinates to 4 decimals ~11m precision)
    const lat1Rounded = Number(start.latitude.toFixed(4));
    const lon1Rounded = Number(start.longitude.toFixed(4));
    const lat2Rounded = Number(end.latitude.toFixed(4));
    const lon2Rounded = Number(end.longitude.toFixed(4));
    const cacheKey = `${lat1Rounded},${lon1Rounded}:${lat2Rounded},${lon2Rounded}`;

    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return {
        travelTimeInSeconds: cached.travelTimeInSeconds,
        trafficDelayInSeconds: cached.trafficDelayInSeconds,
        lengthInMeters: cached.lengthInMeters,
        trafficFactor: cached.trafficFactor,
      };
    }

    // 2. Manage daily call counter using UTC date
    const now = new Date();
    const todayUtc = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}`;
    if (this.currentUtcDay !== todayUtc) {
      this.currentUtcDay = todayUtc;
      this.apiCallCount = 0;
      this.logger.log(`[TomTom API] New UTC day detected (${todayUtc}), resetting API call counter.`);
    }

    this.apiCallCount++;
    this.logger.log(`[TomTom API] Request count today: ${this.apiCallCount}/2500 (UTC)`);
    if (this.apiCallCount >= 2000) {
      this.logger.warn(`[TomTom API] WARNING: Request count is reaching the daily limit: ${this.apiCallCount}/2500`);
    }

    // 3. Make HTTP Call
    const url = `${this.tomtomRoutingUrl}/${start.latitude},${start.longitude}:${end.latitude},${end.longitude}/json?traffic=true&key=${this.apiKey}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        // Detailed log for API errors / Rate limits / Quota limits
        this.logger.warn(`[TomTom API] traffic_factor fallback: API error / quota limit (status: ${response.status})`);
        return fallbackResult;
      }

      const data = await response.json();
      if (!data.routes || data.routes.length === 0) {
        this.logger.warn(`[TomTom API] No routes returned by TomTom, falling back to baseline.`);
        return fallbackResult;
      }

      const summary = data.routes[0].summary;
      const travelTimeInSeconds = summary.travelTimeInSeconds;
      const trafficDelayInSeconds = summary.trafficDelayInSeconds || 0;
      const lengthInMeters = summary.lengthInMeters;

      // 4. Calculate and clamp traffic factor [1.0, 5.0]
      const idealTime = travelTimeInSeconds - trafficDelayInSeconds;
      let trafficFactor = idealTime > 0 ? travelTimeInSeconds / idealTime : 1.0;

      if (trafficFactor < 1.0 || trafficFactor > 5.0) {
        this.logger.warn(`[TomTom API] traffic_factor clamped: out of range [1.0, 5.0] (calculated value: ${trafficFactor.toFixed(4)})`);
        trafficFactor = Math.max(1.0, Math.min(5.0, trafficFactor));
      }

      const result: TrafficResult = {
        travelTimeInSeconds,
        trafficDelayInSeconds,
        lengthInMeters,
        trafficFactor,
      };

      // 5. Save to cache
      this.cache.set(cacheKey, {
        ...result,
        expiresAt: Date.now() + this.cacheTtl * 1000,
      });

      return result;
    } catch (error) {
      // Detailed log for connection / fetch issues
      this.logger.error(`[TomTom API] traffic_factor fallback: connection or response parsing failure`, error.stack);
      return fallbackResult;
    }
  }
}
