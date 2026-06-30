import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RedisService } from '../redis/redis.service';
import {
  CACHE_RULES,
  INVALIDATION_RULES,
  CacheRule,
} from './cache-endpoints.config';

@Injectable()
export class GlobalCacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(GlobalCacheInterceptor.name);

  constructor(private readonly redisService: RedisService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();
    const { method, path: reqPath } = request;

    // 1. Check for Cache Invalidation Rules
    const isWriteRequest = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    if (isWriteRequest) {
      await this.handleInvalidation(method, reqPath);
      return next.handle();
    }

    // 2. Find matching Cache Rule
    const rule = this.findCacheRule(method, reqPath, request);
    if (!rule) {
      return next.handle();
    }

    // 3. Generate unique cache key
    const cacheKey = rule.makeKey ? rule.makeKey(request) : rule.keyPrefix;

    try {
      // 4. Try fetching from Redis Cache
      const cachedData = await this.redisService.get(cacheKey);
      if (cachedData) {
        this.logger.debug(
          `[Cache Hit] Serving response for ${method} ${reqPath} from cache key: ${cacheKey}`,
        );
        try {
          const parsed = JSON.parse(cachedData);
          return of(parsed);
        } catch (e) {
          // If JSON parse fails, fall back to executing request
          this.logger.warn(`Failed to parse cached JSON for key: ${cacheKey}`);
        }
      }
    } catch (err) {
      this.logger.error(`Error querying cache for key ${cacheKey}:`, err);
    }

    // 5. Cache Miss: Execute handler and save result
    this.logger.debug(
      `[Cache Miss] Querying database for ${method} ${reqPath}, caching to: ${cacheKey}`,
    );
    return next.handle().pipe(
      tap((data) => {
        if (data !== undefined && data !== null) {
          this.redisService
            .set(cacheKey, JSON.stringify(data), rule.ttl)
            .then(() => {
              this.logger.debug(
                `[Cache Set] Successfully cached key: ${cacheKey} with TTL: ${rule.ttl}s`,
              );
            })
            .catch((err) => {
              this.logger.error(
                `Failed to cache response for key ${cacheKey}:`,
                err,
              );
            });
        }
      }),
    );
  }

  /**
   * Matches request against CacheRules using regex and NestJS path keys.
   */
  private findCacheRule(
    method: string,
    reqPath: string,
    request: any,
  ): CacheRule | null {
    // Clean up trailing slash and prepend / if missing
    let cleanPath = reqPath.endsWith('/') ? reqPath.slice(0, -1) : reqPath;
    if (!cleanPath.startsWith('/')) cleanPath = '/' + cleanPath;

    // Check if the current controller route matches directly
    const routePath = request.route?.path;

    for (const rule of CACHE_RULES) {
      if (rule.method !== method) continue;

      // Match by exact route path (Express route definition) if available
      if (routePath && routePath === rule.routePattern) {
        return rule;
      }

      // Fallback: Regex matching on request path
      if (this.matchRoutePattern(rule.routePattern, cleanPath)) {
        return rule;
      }
    }

    return null;
  }

  /**
   * Helper to check if a request path matches a route pattern (e.g. /locations/:id matches /locations/12)
   */
  private matchRoutePattern(pattern: string, path: string): boolean {
    // Replace Express-style route parameters e.g. :id or :type with regex groups
    const regexStr = pattern
      .replace(/:[a-zA-Z0-9_]+/g, '[a-zA-Z0-9_\\-]+')
      .replace(/\//g, '\\/');
    const regex = new RegExp(`^${regexStr}$`);
    return regex.test(path);
  }

  /**
   * Handles automatic cache invalidation on database write operations (POST, PUT, PATCH, DELETE)
   */
  private async handleInvalidation(
    method: string,
    reqPath: string,
  ): Promise<void> {
    for (const rule of INVALIDATION_RULES) {
      if (!rule.methods.includes(method as any)) continue;

      // Match invalidation path using start prefix match or pattern regex
      const isMatch =
        reqPath.startsWith(rule.routePattern) ||
        this.matchRoutePattern(rule.routePattern, reqPath);
      if (isMatch) {
        this.logger.debug(
          `[Cache Invalidation] Write request ${method} ${reqPath} matched rule for ${rule.routePattern}`,
        );

        for (const keyPattern of rule.keysToInvalidate) {
          try {
            // Find all matching keys in Redis
            const matchedKeys = await this.redisService.keys(keyPattern);
            if (matchedKeys && matchedKeys.length > 0) {
              this.logger.debug(
                `Found ${matchedKeys.length} matching keys to invalidate: ${matchedKeys.join(', ')}`,
              );
              for (const key of matchedKeys) {
                await this.redisService.del(key);
              }
              this.logger.log(
                `[Cache Invalidation] Successfully cleared ${matchedKeys.length} keys matching: ${keyPattern}`,
              );
            }
          } catch (err) {
            this.logger.error(
              `Error invalidating keys for pattern ${keyPattern}:`,
              err,
            );
          }
        }
      }
    }
  }
}
