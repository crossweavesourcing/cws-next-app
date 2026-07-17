import { getPasswordPoliciesCollection } from '@/database';
import { DEFAULT_PASSWORD_POLICY, type PasswordPolicy } from '@/auth/validation/password-policy';

/**
 * Reads the active password policy. Falls back to safe defaults when none is
 * configured yet (the collection exists but is empty).
 */
export class PasswordPolicyRepository {
  async getActivePolicy(): Promise<PasswordPolicy> {
    const coll = await getPasswordPoliciesCollection();
    const doc = await coll.findOne({ name: 'default' });
    if (!doc) return DEFAULT_PASSWORD_POLICY;
    return {
      minLength: doc.minLength,
      maxLength: doc.maxLength,
      requireUppercase: doc.requireUppercase,
      requireLowercase: doc.requireLowercase,
      requireNumber: doc.requireNumber,
      requireSpecialChar: doc.requireSpecialChar,
      expirationDays: doc.expirationDays,
      historyCount: doc.historyCount,
    };
  }

  /** Ensures a default policy doc exists (idempotent bootstrap). */
  async ensureDefault(): Promise<void> {
    const coll = await getPasswordPoliciesCollection();
    await coll.updateOne(
      { name: 'default' },
      {
        $setOnInsert: {
          name: 'default',
          ...DEFAULT_PASSWORD_POLICY,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );
  }
}
