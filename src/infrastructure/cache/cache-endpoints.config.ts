import { CACHE_ROUTES, CACHE_KEYS } from '../../shared';

export interface CacheRule {
  method: 'GET' | 'POST';
  routePattern: string;
  keyPrefix: string;
  ttl: number;
  makeKey?: (req: any) => string;
}

export interface InvalidationRule {
  methods: ('POST' | 'PUT' | 'PATCH' | 'DELETE')[];
  routePattern: string;
  keysToInvalidate: string[];
}

export const CACHE_RULES: CacheRule[] = [
  {
    method: 'GET',
    routePattern: CACHE_ROUTES.PROVINCES,
    keyPrefix: CACHE_KEYS.PROVINCES,
    ttl: 86400,
  },
  {
    method: 'GET',
    routePattern: CACHE_ROUTES.PROVINCE_DETAIL,
    keyPrefix: CACHE_KEYS.PROVINCE,
    ttl: 86400,
    makeKey: (req) => `${CACHE_KEYS.PROVINCE}:id:${req.params.id}`,
  },
  {
    method: 'GET',
    routePattern: CACHE_ROUTES.WARDS,
    keyPrefix: CACHE_KEYS.WARDS,
    ttl: 86400,
    makeKey: (req) =>
      `${CACHE_KEYS.WARDS}:province:${req.query.provinceId || 'all'}`,
  },
  {
    method: 'GET',
    routePattern: CACHE_ROUTES.PROVINCE_CENTER,
    keyPrefix: CACHE_KEYS.PROVINCE_CENTER,
    ttl: 86400,
    makeKey: (req) => `${CACHE_KEYS.PROVINCE}:id:${req.params.id}:center`,
  },
  {
    method: 'GET',
    routePattern: CACHE_ROUTES.GEOCODE,
    keyPrefix: CACHE_KEYS.GEOCODE,
    ttl: 86400,
    makeKey: (req) => {
      const q = req.query.q || '';
      const limit = req.query.limit || '';
      const viewbox = req.query.viewbox || '';
      return `${CACHE_KEYS.GEOCODE}:q:${q}:limit:${limit}:viewbox:${viewbox}`;
    },
  },
  {
    method: 'GET',
    routePattern: CACHE_ROUTES.SYSTEM_SETTINGS,
    keyPrefix: CACHE_KEYS.SYSTEM_SETTINGS_ALL,
    ttl: 3600,
  },
  {
    method: 'GET',
    routePattern: CACHE_ROUTES.SYSTEM_CATEGORIES,
    keyPrefix: CACHE_KEYS.SYSTEM_CATEGORIES,
    ttl: 3600,
    makeKey: (req) => `${CACHE_KEYS.SYSTEM_CATEGORIES}:type:${req.params.type}`,
  },
  {
    method: 'GET',
    routePattern: CACHE_ROUTES.TEAM_SPECIALIZATIONS,
    keyPrefix: CACHE_KEYS.TEAM_SPECIALIZATIONS_ALL,
    ttl: 86400,
  },
  {
    method: 'GET',
    routePattern: CACHE_ROUTES.ROLES,
    keyPrefix: CACHE_KEYS.ROLES_ALL,
    ttl: 86400,
  },
  {
    method: 'POST',
    routePattern: CACHE_ROUTES.ROUTING_CALCULATE,
    keyPrefix: CACHE_KEYS.ROUTING_CALCULATE,
    ttl: 3600,
    makeKey: (req) => {
      const bodyStr = JSON.stringify(req.body || {});
      let hash = 0;
      for (let i = 0; i < bodyStr.length; i++) {
        const char = bodyStr.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0;
      }
      return `${CACHE_KEYS.ROUTING_CALCULATE}:hash:${hash}`;
    },
  },
];

export const INVALIDATION_RULES: InvalidationRule[] = [
  {
    methods: ['PATCH'],
    routePattern: CACHE_ROUTES.SYSTEM_SETTINGS,
    keysToInvalidate: [`${CACHE_KEYS.SYSTEM_SETTINGS_ALL}*`],
  },
  {
    methods: ['POST', 'DELETE'],
    routePattern: CACHE_ROUTES.SYSTEM_CATEGORIES_BASE,
    keysToInvalidate: [`${CACHE_KEYS.SYSTEM_CATEGORIES}*`],
  },
  {
    methods: ['POST', 'PUT', 'PATCH', 'DELETE'],
    routePattern: CACHE_ROUTES.TEAM_SPECIALIZATIONS,
    keysToInvalidate: [`${CACHE_KEYS.TEAM_SPECIALIZATIONS_ALL}*`],
  },
];
