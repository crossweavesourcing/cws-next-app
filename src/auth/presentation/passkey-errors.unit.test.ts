import { describe, expect, it } from 'vitest';
import { getFriendlyPasskeyError } from './passkey-errors';

describe('friendly passkey errors', () => {
  it('hides the browser timeout and privacy message', () => {
    const error = new DOMException(
      'The operation either timed out or was not allowed. See: https://www.w3.org/TR/webauthn-2/#sctn-privacy-considerations-client.',
      'NotAllowedError'
    );

    expect(getFriendlyPasskeyError(error, 'setup')).toBe("Passkey setup was cancelled. You can try again when you're ready.");
  });

  it('uses action-specific cancellation copy', () => {
    expect(getFriendlyPasskeyError(new DOMException('The user cancelled the request.', 'AbortError'), 'sign-in')).toBe(
      "Passkey sign-in was cancelled. Try again when you're ready."
    );
    expect(getFriendlyPasskeyError(new Error('Authentication cancelled by user'), 'verification')).toBe(
      'Passkey verification was cancelled. Choose passkey again or use another verification method.'
    );
  });

  it('explains browser and connection support issues without internal names', () => {
    expect(getFriendlyPasskeyError(new DOMException('Only secure origins are allowed.', 'SecurityError'), 'setup')).toBe(
      'Passkeys are not available in this browser or connection. Use a supported browser on a secure connection, or choose another method.'
    );
    expect(getFriendlyPasskeyError(new DOMException('WebAuthn is unavailable.', 'NotSupportedError'), 'sign-in')).toBe(
      'Passkeys are not available in this browser or connection. Use a supported browser on a secure connection, or choose another method.'
    );
  });

  it('uses friendly fallback text for unknown failures', () => {
    expect(getFriendlyPasskeyError({ reason: 'internal browser state' }, 'verification')).toBe(
      'Passkey verification did not finish. Please try again.'
    );
  });

  it('uses helpful copy when a passkey is already saved', () => {
    expect(getFriendlyPasskeyError(new DOMException('Credential already exists.', 'InvalidStateError'), 'setup')).toBe(
      'That passkey may already be saved for this account. Try a different passkey or remove the existing one first.'
    );
  });
});
