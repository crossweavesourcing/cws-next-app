// ─────────────────────────────────────────────────────────────────────────────
// Public API: src/database/
//
// Import from here: import { getDb, getUsersCollection } from '@/database'
// ─────────────────────────────────────────────────────────────────────────────

export { getDatabaseConfig, DatabaseConfigError }   from './config';
export type { DatabaseConfig }                      from './config';

export { getMongoClient, getDb }                    from './client';

export { checkDatabaseHealth }                      from './health';
export type { HealthStatus, HealthCheckResult }     from './health';

export { setupDatabaseObservability }               from './observability';
export type { ObservabilityOptions, SlowQueryEvent, CommandErrorEvent } from './observability';

export {
  setupSecurityAlerting,
  getActiveSecuritySink,
  createConsoleSecuritySink,
  createWebhookSecuritySink,
  createDefaultSecuritySink,
}                                                       from './observability';
export type {
  SecurityAlertSink,
  SecurityEvent,
  SecurityEventSeverity,
  SecurityAlertingOptions,
}                                                       from './observability';

export { withRetry }                                from './retry';
export type { RetryOptions }                        from './retry';

export { registerShutdownHandlers }                 from './shutdown';
export type { ShutdownOptions }                     from './shutdown';

export {
  archiveAuditLogs,
  pruneExpiredDocuments,
  getCollectionStats,
}                                                   from './maintenance';
export type { ArchiveOptions, ArchiveResult, CollectionStat, PruneResult } from './maintenance';

export { initializeDatabase }                       from './init';
export type { InitReport, CollectionReport, CollectionAction } from './init';

export { COLLECTION_NAMES, COLLECTION_ORDER }       from './constants';
export type { CollectionName }                      from './constants';

export {
  getUsersCollection,
  getUserEmailsCollection,
  getUserPhonesCollection,
  getOAuthAccountsCollection,
  getDevicesCollection,
  getSessionsCollection,
  getRefreshTokensCollection,
  getVerificationTokensCollection,
  getOtpCodesCollection,
  getRecoveryCodesCollection,
  getAuditLogsCollection,
  getLoginAttemptsCollection,
  getPasswordPoliciesCollection,
  getPasswordHistoryCollection,
  getTotpCredentialsCollection,
  getWebAuthnCredentialsCollection,
  getMobileAuthChallengesCollection,
}                                                   from './collections';

export { ALL_SCHEMAS }                              from './schemas';
export { ALL_INDEXES }                              from './indexes';
