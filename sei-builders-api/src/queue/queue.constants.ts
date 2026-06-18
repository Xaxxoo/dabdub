export const QUEUE_NAMES = {
  NOTIFICATIONS: 'notifications',
  GITHUB_SYNC: 'github-sync',
  ANALYTICS: 'analytics',
  EMAILS: 'emails',
  WEBHOOKS: 'webhooks',
  AUDIT: 'audit',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export const JOB_NAMES = {
  // Notifications
  SEND_NOTIFICATION: 'send-notification',
  SEND_BULK_NOTIFICATIONS: 'send-bulk-notifications',

  // Emails
  SEND_WELCOME_EMAIL: 'send-welcome-email',
  SEND_PASSWORD_RESET: 'send-password-reset',
  SEND_INVITE_EMAIL: 'send-invite-email',
  SEND_DIGEST_EMAIL: 'send-digest-email',

  // Analytics
  RECORD_EVENT: 'record-event',
  AGGREGATE_STATS: 'aggregate-stats',
  GENERATE_REPORT: 'generate-report',

  // Webhooks
  PROCESS_GITHUB_WEBHOOK: 'process-github-webhook',
  DELIVER_WEBHOOK: 'deliver-webhook',

  // Audit
  LOG_AUDIT_EVENT: 'log-audit-event',
  EXPORT_AUDIT_LOG: 'export-audit-log',

  // GitHub sync
  SYNC_REPOSITORIES: 'sync-repositories',
  SYNC_REPOSITORY: 'sync-repository',
  SYNC_REPOSITORY_ISSUES: 'sync-repository-issues',
  SYNC_REPOSITORY_PRS: 'sync-repository-prs',
  SYNC_REPOSITORY_CONTRIBUTORS: 'sync-repository-contributors',
  SYNC_REPOSITORY_LANGUAGES: 'sync-repository-languages',
  SYNC_CONTRIBUTORS: 'sync-contributors',
  SYNC_GITHUB_ORG: 'sync-github-org',
  SYNC_GITHUB_TEAMS: 'sync-github-teams',

  // Dead-letter / retry
  DLQ_WEBHOOK: 'dlq-webhook',
  DLQ_SYNC: 'dlq-sync',
  RETRY_WEBHOOK: 'retry-webhook',
  RETRY_SYNC: 'retry-sync',
} as const;
