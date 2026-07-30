export type PasskeyErrorContext = 'setup' | 'sign-in' | 'verification';

const cancelledMessages: Record<PasskeyErrorContext, string> = {
  setup: "Passkey setup was cancelled. You can try again when you're ready.",
  'sign-in': "Passkey sign-in was cancelled. Try again when you're ready.",
  verification: 'Passkey verification was cancelled. Choose passkey again or use another verification method.',
};

const unfinishedMessages: Record<PasskeyErrorContext, string> = {
  setup: 'Passkey setup did not finish. Please try again.',
  'sign-in': 'Passkey sign-in did not finish. Please try again.',
  verification: 'Passkey verification did not finish. Please try again.',
};

const unsupportedMessage =
  'Passkeys are not available in this browser or connection. Use a supported browser on a secure connection, or choose another method.';

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : '';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : typeof error === 'string' ? error : '';
}

export function getFriendlyPasskeyError(error: unknown, context: PasskeyErrorContext): string {
  const name = errorName(error).toLowerCase();
  const message = errorMessage(error).toLowerCase();
  const combined = `${name} ${message}`;

  if (name === 'securityerror' || name === 'notsupportederror') {
    return unsupportedMessage;
  }

  if (
    name === 'notallowederror' ||
    name === 'aborterror' ||
    combined.includes('privacy-considerations-client') ||
    combined.includes('webauthn-2') ||
    combined.includes('timed out') ||
    combined.includes('not allowed') ||
    combined.includes('cancel')
  ) {
    return cancelledMessages[context];
  }

  if (name === 'invalidstateerror' || combined.includes('already registered') || combined.includes('already exists')) {
    return 'That passkey may already be saved for this account. Try a different passkey or remove the existing one first.';
  }

  return unfinishedMessages[context];
}
