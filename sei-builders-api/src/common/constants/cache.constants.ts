export const CACHE_KEYS = {
  USER: (id: string) => `user:${id}`,
  USER_BY_GITHUB: (githubId: string) => `user:github:${githubId}`,
  ROLES: 'roles:all',
  ROLE: (id: string) => `role:${id}`,
  PERMISSIONS: (roleId: string) => `permissions:role:${roleId}`,
  USER_PERMISSIONS: (userId: string) => `permissions:user:${userId}`,
  ORGANIZATION: (id: string) => `organization:${id}`,
  ORGANIZATION_BY_SLUG: (slug: string) => `organization:slug:${slug}`,
  ORGANIZATION_MEMBERS: (orgId: string) => `organization:${orgId}:members`,
  PROJECT: (id: string) => `project:${id}`,
  PROJECT_BY_SLUG: (slug: string) => `project:slug:${slug}`,
  OPPORTUNITY: (id: string) => `opportunity:${id}`,
  CONTRIBUTOR: (userId: string) => `contributor:${userId}`,
  ANALYTICS_OVERVIEW: (period: string) => `analytics:overview:${period}`,
  ANALYTICS_ORG: (orgId: string, period: string) => `analytics:org:${orgId}:${period}`,
  ANALYTICS: (period: string) => `analytics:${period}`,
  ACTIVITY_FEED: (page: number) => `activity:feed:${page}`,
  SKILLS: 'skills:all',
  TAGS: 'tags:all',
  CATEGORIES: 'categories:all',
} as const;

export const CACHE_TTL = {
  SHORT: 60,          // 1 minute
  MEDIUM: 300,         // 5 minutes
  LONG: 3600,         // 1 hour
  VERY_LONG: 86400,   // 24 hours
  USER: 300,
  PERMISSIONS: 300,
  ORGANIZATION: 300,
  PROJECT: 300,
  ANALYTICS: 300,
  OPPORTUNITY: 120,
  CONTRIBUTOR: 300,
  STATIC: 3600,
} as const;
