export class AuthError extends Error {
  readonly code: string;
  readonly publicMessage: string;

  constructor(code: string, publicMessage: string, internalMessage?: string) {
    super(internalMessage || publicMessage);
    this.name = this.constructor.name;
    this.code = code;
    this.publicMessage = publicMessage;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidCredentialsError extends AuthError {
  constructor(internalMessage?: string) {
    super(
      'AUTH_INVALID_CREDENTIALS',
      'Invalid email address or password.',
      internalMessage || 'Password verification failed'
    );
  }
}

export class AccountLockedError extends AuthError {
  readonly lockedUntil: Date;

  constructor(lockedUntil: Date, internalMessage?: string) {
    super(
      'AUTH_ACCOUNT_LOCKED',
      `Account is locked due to too many failed login attempts. Please try again after ${lockedUntil.toLocaleTimeString()}.`,
      internalMessage || `Account locked until ${lockedUntil.toISOString()}`
    );
    this.lockedUntil = lockedUntil;
  }
}

export class AccountSuspendedError extends AuthError {
  constructor(reason?: string) {
    super(
      'AUTH_ACCOUNT_SUSPENDED',
      'This account has been suspended. Please contact an administrator.',
      reason ? `Account suspended. Reason: ${reason}` : 'Account suspended'
    );
  }
}

export class AccountDeletedError extends AuthError {
  constructor() {
    super(
      'AUTH_ACCOUNT_DELETED',
      'This account has been deactivated.',
      'Account soft-deleted'
    );
  }
}

export class AccountDisabledError extends AuthError {
  constructor() {
    super(
      'AUTH_ACCOUNT_DISABLED',
      'This account has been disabled. Please contact an administrator.',
      'Account disabled (status is deactivated/inactive)'
    );
  }
}

export class ForcePasswordChangeError extends AuthError {
  constructor() {
    super(
      'AUTH_FORCE_PASSWORD_CHANGE',
      'You must change your password before accessing the dashboard.',
      'Force password change required'
    );
  }
}

export class SessionExpiredError extends AuthError {
  constructor() {
    super(
      'AUTH_SESSION_EXPIRED',
      'Your session has expired or is invalid. Please sign in again.',
      'Session expired or invalid token signature'
    );
  }
}

export class RateLimitError extends AuthError {
  readonly retryAfterMs: number;

  constructor(retryAfterMs: number, internalMessage?: string) {
    const seconds = Math.ceil(retryAfterMs / 1000);
    super(
      'AUTH_RATE_LIMITED',
      `Too many login attempts. Please try again in ${seconds} second${seconds !== 1 ? 's' : ''}.`,
      internalMessage || `Rate limited. Retry after ${retryAfterMs}ms`
    );
    this.retryAfterMs = retryAfterMs;
  }
}

export class InternalAuthError extends AuthError {
  constructor(internalMessage?: string) {
    super(
      'AUTH_INTERNAL',
      'An internal system error occurred. Please try again later.',
      internalMessage || 'Unhandled exception in auth service'
    );
  }
}
