export const APP_NAME = 'SEI Builders Hub';
export const API_VERSION = 'v1';
export const API_PREFIX = `api/${API_VERSION}`;

export const BCRYPT_ROUNDS = 12;

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const TOKEN_TYPES = {
  ACCESS: 'access',
  REFRESH: 'refresh',
} as const;

export const COOKIE_NAMES = {
  REFRESH_TOKEN: 'sei_refresh_token',
  ACCESS_TOKEN: 'sei_access_token',
} as const;

export const HEADER_NAMES = {
  REQUEST_ID: 'x-request-id',
  CORRELATION_ID: 'x-correlation-id',
  USER_AGENT: 'user-agent',
  FORWARDED_FOR: 'x-forwarded-for',
} as const;

export const SWAGGER_TAG = {
  AUTH: 'Authentication',
  USERS: 'Users',
  ORGANIZATIONS: 'Organizations',
  PROJECTS: 'Projects',
  REPOSITORIES: 'Repositories',
  CONTRIBUTORS: 'Contributors',
  APPLICATIONS: 'Applications',
  OPPORTUNITIES: 'Opportunities',
  GITHUB: 'GitHub',
  NOTIFICATIONS: 'Notifications',
  ANALYTICS: 'Analytics',
  ACTIVITY: 'Activity',
  ADMIN: 'Admin',
  PERMISSIONS: 'Permissions',
} as const;

export const METADATA_KEYS = {
  IS_PUBLIC: 'isPublic',
  ROLES: 'roles',
  PERMISSIONS: 'permissions',
  SKIP_AUDIT: 'skipAudit',
} as const;
