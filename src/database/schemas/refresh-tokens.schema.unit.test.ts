import { describe, expect, it } from 'vitest';
import { refreshTokensSchema } from './refresh-tokens.schema';

describe('refresh_tokens MongoDB schema', () => {
  it('accepts every refresh-token revocation reason used by the auth domain', () => {
    const revokedReason = refreshTokensSchema.properties.revokedReason as {
      enum: Array<string | null>;
    };

    expect(revokedReason.enum).toEqual(expect.arrayContaining([
      'rotated',
      'logout',
      'session_revoked',
      'reuse_detected',
      'admin',
      'device_blocked',
      'step_up_pending',
      'theft_detected',
      null,
    ]));
  });
});
