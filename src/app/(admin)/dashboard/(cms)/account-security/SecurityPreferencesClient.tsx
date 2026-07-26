'use client';

import { useActionState } from 'react';
import { updateTwoFaPreferencesAction } from '@/auth/actions/mfa';

export function SecurityPreferencesClient({
  preference,
  defaultMethod,
  hasTotp,
  hasWebAuthn,
}: {
  preference: 'always' | 'new_device_only' | 'off';
  defaultMethod: 'email' | 'totp' | 'webauthn' | null;
  hasTotp: boolean;
  hasWebAuthn: boolean;
}) {
  const [, formAction, isPending] = useActionState(async (_state: unknown, formData: FormData) => {
    const pref = formData.get('preference') as 'always' | 'new_device_only' | 'off';
    const method = formData.get('defaultMethod') as 'email' | 'totp' | 'webauthn';
    try {
      await updateTwoFaPreferencesAction(pref, method);
      return { success: true };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Error updating preferences' };
    }
  }, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-sm font-bold text-neutral-900">Require 2FA</p>
          <p className="mt-1 text-xs text-neutral-500">
            Choose when you want to be asked for a verification code.
          </p>
        </div>
        
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="preference"
              value="off"
              defaultChecked={preference === 'off'}
              onChange={(e) => {
                if (e.target.form) e.target.form.requestSubmit();
              }}
              disabled={isPending}
              className="accent-black"
            />
            <span className="text-sm text-neutral-800">Off</span>
          </label>

          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="preference"
              value="new_device_only"
              defaultChecked={preference === 'new_device_only'}
              onChange={(e) => {
                if (e.target.form) e.target.form.requestSubmit();
              }}
              disabled={isPending}
              className="accent-black"
            />
            <span className="text-sm text-neutral-800">Only on new, untrusted devices</span>
          </label>

          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="preference"
              value="always"
              defaultChecked={preference === 'always'}
              onChange={(e) => {
                if (e.target.form) e.target.form.requestSubmit();
              }}
              disabled={isPending}
              className="accent-black"
            />
            <span className="text-sm text-neutral-800">Always</span>
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-6 border-t border-neutral-200">
        <div>
          <p className="text-sm font-bold text-neutral-900">Default Verification Method</p>
          <p className="mt-1 text-xs text-neutral-500">
            Choose which method you want to use by default when signing in.
          </p>
        </div>
        
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="defaultMethod"
              value="email"
              defaultChecked={defaultMethod === 'email'}
              onChange={(e) => {
                if (e.target.form) e.target.form.requestSubmit();
              }}
              disabled={isPending}
              className="accent-black"
            />
            <span className="text-sm text-neutral-800">Email</span>
          </label>

          {hasTotp && (
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="defaultMethod"
                value="totp"
                defaultChecked={defaultMethod === 'totp'}
                onChange={(e) => {
                  if (e.target.form) e.target.form.requestSubmit();
                }}
                disabled={isPending}
                className="accent-black"
              />
              <span className="text-sm text-neutral-800">Authenticator App</span>
            </label>
          )}

          {hasWebAuthn && (
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="defaultMethod"
                value="webauthn"
                defaultChecked={defaultMethod === 'webauthn'}
                onChange={(e) => {
                  if (e.target.form) e.target.form.requestSubmit();
                }}
                disabled={isPending}
                className="accent-black"
              />
              <span className="text-sm text-neutral-800">Passkey</span>
            </label>
          )}
        </div>
      </div>
    </form>
  );
}
