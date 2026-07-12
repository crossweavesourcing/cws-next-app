import type { ObjectId } from 'mongodb';
import type { OAuthProvider } from './shared.types';

export interface OAuthAccountDocument {
  readonly _id:    ObjectId;
  readonly userId: ObjectId;

  provider: OAuthProvider;

  /**
   * Stable unique account ID from the provider.
   * For OIDC providers: the `sub` claim.
   * Compound unique index (provider + providerAccountId) prevents double-linking.
   */
  readonly providerAccountId: string;

  /**
   * Email reported by provider at link-time.
   * Informational only — NOT authoritative. user_emails is authoritative.
   */
  providerEmail: string | null;

  /**
   * Raw provider profile snapshot. Structure varies by provider.
   * Stored for display/debugging. Not queried — no index.
   */
  profile: Record<string, unknown> | null;

  readonly linkedAt: Date;

  /** Last time this provider was used to authenticate. */
  lastUsedAt: Date | null;
}
