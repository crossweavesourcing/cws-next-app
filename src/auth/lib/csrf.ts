import { assertSameOrigin, CsrfError } from './request';

/**
 * CSRF guard wrapper for Server Actions (C1 hardening).
 *
 * Next.js Server Actions already include built-in CSRF protection (encrypted
 * action IDs + POST-only enforcement). This wrapper adds an EXPLICIT,
 * uniform origin check on top of that baseline so the control is visible,
 * testable, and consistent across every state-changing auth action — not
 * relying on per-action discipline.
 *
 * On a cross-origin request `assertSameOrigin` throws `CsrfError`; we map it
 * to a neutral error object (`{ error: 'Request blocked.' }`) so the client
 * never learns the offending origin. The wrapper is generic over the action's
 * argument tuple and return type, so it works for any `'use server'` action.
 *
 * Usage:
 *   export const loginAction = withCsrfGuard(_loginAction);
 */
export function withCsrfGuard<
  Args extends unknown[],
  R extends { error?: string } | void | Promise<{ error?: string } | void>,
>(action: (...args: Args) => R): (...args: Args) => Promise<Awaited<R>> {
  return async (...args: Args): Promise<Awaited<R>> => {
    try {
      await assertSameOrigin();
    } catch (err) {
      if (err instanceof CsrfError) {
        // Most auth actions return an object with an `error` field.
        // For actions that return void, this object is simply ignored by callers.
        return { error: 'Request blocked.' } as Awaited<R>;
      }
      throw err;
    }
    return (await action(...args)) as Awaited<R>;
  };
}
