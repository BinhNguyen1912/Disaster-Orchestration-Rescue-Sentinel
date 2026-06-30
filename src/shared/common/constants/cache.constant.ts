export const CACHE_ROUTES = {
  PROVINCES: '/locations/provinces',
  PROVINCE_DETAIL: '/locations/provinces/:id',
  WARDS: '/locations/wards',
  PROVINCE_CENTER: '/locations/provinces/:id/center',
  GEOCODE: '/locations/geocode',
  SYSTEM_SETTINGS: '/system-settings',
  SYSTEM_CATEGORIES: '/system-settings/categories/:type',
  SYSTEM_CATEGORIES_BASE: '/system-settings/categories',
  TEAM_SPECIALIZATIONS: '/team-specializations',
  ROLES: '/roles',
  ROUTING_CALCULATE: '/routing/calculate',
};

export const CACHE_KEYS = {
  PROVINCES: 'locations:provinces',
  PROVINCE: 'locations:province',
  WARDS: 'locations:wards',
  PROVINCE_CENTER: 'locations:province-center',
  GEOCODE: 'locations:geocode',
  SYSTEM_SETTINGS_ALL: 'system-settings:all',
  SYSTEM_CATEGORIES: 'system-settings:categories',
  TEAM_SPECIALIZATIONS_ALL: 'team-specializations:all',
  ROLES_ALL: 'roles:all',
  ROUTING_CALCULATE: 'routing:calculate',
};
