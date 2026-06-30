/**
 * Centralized Cache Configuration File
 * All cached endpoints, TTLs, and cache invalidation rules are configured here.
 */

export interface CacheRule {
  /**
   * The HTTP method of the request to cache.
   * Typically GET, but can be POST for query-heavy operations (e.g. routing).
   */
  method: 'GET' | 'POST';

  /**
   * Route pattern to match. E.g., '/locations/provinces'
   * Can contain parameters like ':id'.
   */
  routePattern: string;

  /**
   * Redis key prefix. E.g., 'locations:provinces'
   */
  keyPrefix: string;

  /**
   * Time to live (TTL) in seconds.
   */
  ttl: number;

  /**
   * Custom function to extract a unique cache key from the request.
   */
  makeKey?: (req: any) => string;
}

export interface InvalidationRule {
  /**
   * HTTP Methods that trigger invalidation.
   */
  methods: ('POST' | 'PUT' | 'PATCH' | 'DELETE')[];

  /**
   * Route pattern that triggers invalidation.
   * E.g., '/system-settings' or '/system-settings/categories'
   */
  routePattern: string;

  /**
   * Redis key patterns to delete.
   * Supports wildcards. E.g., ['system-settings:*']
   */
  keysToInvalidate: string[];
}

export const CACHE_RULES: CacheRule[] = [
  // 1. Locations list (GET /locations/provinces) - TTL: 1 day (86400s)
  {
    method: 'GET',
    routePattern: '/locations/provinces',
    keyPrefix: 'locations:provinces',
    ttl: 86400,
  },
  // 2. Specific Province (GET /locations/provinces/:id) - TTL: 1 day (86400s)
  {
    method: 'GET',
    routePattern: '/locations/provinces/:id',
    keyPrefix: 'locations:province',
    ttl: 86400,
    makeKey: (req) => `locations:province:id:${req.params.id}`,
  },
  // 3. Wards list (GET /locations/wards?provinceId=X) - TTL: 1 day (86400s)
  {
    method: 'GET',
    routePattern: '/locations/wards',
    keyPrefix: 'locations:wards',
    ttl: 86400,
    makeKey: (req) =>
      `locations:wards:province:${req.query.provinceId || 'all'}`,
  },
  // 4. Province Center (GET /locations/provinces/:id/center) - TTL: 1 day (86400s)
  {
    method: 'GET',
    routePattern: '/locations/provinces/:id/center',
    keyPrefix: 'locations:province-center',
    ttl: 86400,
    makeKey: (req) => `locations:province:id:${req.params.id}:center`,
  },
  // 5. Geocode requests (GET /locations/geocode?q=X&limit=Y&viewbox=Z) - TTL: 1 day (86400s)
  {
    method: 'GET',
    routePattern: '/locations/geocode',
    keyPrefix: 'locations:geocode',
    ttl: 86400,
    makeKey: (req) => {
      const q = req.query.q || '';
      const limit = req.query.limit || '';
      const viewbox = req.query.viewbox || '';
      return `locations:geocode:q:${q}:limit:${limit}:viewbox:${viewbox}`;
    },
  },
  // 6. System settings (GET /system-settings) - TTL: 1 hour (3600s)
  {
    method: 'GET',
    routePattern: '/system-settings',
    keyPrefix: 'system-settings:all',
    ttl: 3600,
  },
  // 7. System categories (GET /system-settings/categories/:type) - TTL: 1 hour (3600s)
  {
    method: 'GET',
    routePattern: '/system-settings/categories/:type',
    keyPrefix: 'system-settings:categories',
    ttl: 3600,
    makeKey: (req) => `system-settings:categories:type:${req.params.type}`,
  },
  // 8. Team specializations (GET /team-specializations) - TTL: 1 day (86400s)
  {
    method: 'GET',
    routePattern: '/team-specializations',
    keyPrefix: 'team-specializations:all',
    ttl: 86400,
  },
  // 9. Roles list (GET /roles) - TTL: 1 day (86400s)
  {
    method: 'GET',
    routePattern: '/roles',
    keyPrefix: 'roles:all',
    ttl: 86400,
  },
  // 10. Heavy routing calculation (POST /routing/calculate) - TTL: 1 hour (3600s)
  {
    method: 'POST',
    routePattern: '/routing/calculate',
    keyPrefix: 'routing:calculate',
    ttl: 3600,
    makeKey: (req) => {
      // Calculate a unique key based on the POST body (coordinates and avoidPolygons)
      const bodyStr = JSON.stringify(req.body || {});
      // Simple hash function for request body string to generate short key
      let hash = 0;
      for (let i = 0; i < bodyStr.length; i++) {
        const char = bodyStr.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0; // Convert to 32bit integer
      }
      return `routing:calculate:hash:${hash}`;
    },
  },
];

export const INVALIDATION_RULES: InvalidationRule[] = [
  // Invalidate settings cache when updated
  {
    methods: ['PATCH'],
    routePattern: '/system-settings',
    keysToInvalidate: ['system-settings:all*'],
  },
  // Invalidate categories cache when categories are added or deleted
  {
    methods: ['POST', 'DELETE'],
    routePattern: '/system-settings/categories',
    keysToInvalidate: ['system-settings:categories*'],
  },
  // Invalidate specializations when changed (if endpoints are added in the future)
  {
    methods: ['POST', 'PUT', 'PATCH', 'DELETE'],
    routePattern: '/team-specializations',
    keysToInvalidate: ['team-specializations:all*'],
  },
];
