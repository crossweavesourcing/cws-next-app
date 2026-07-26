'use client';

import { Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  evaluatePasswordStrength,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '@/auth/validation/password-strength';

const labels = {
  very_weak: 'Very weak',
  weak: 'Weak',
  fair: 'Fair',
  strong: 'Strong',
  very_strong: 'Very strong',
};

export function PasswordStrengthFields({
  contextualInputs = [],
  weakConfirmationRequested = false,
}: {
  contextualInputs?: string[];
  weakConfirmationRequested?: boolean;
}) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState(false);
  const strength = useMemo(
    () => evaluatePasswordStrength(password, contextualInputs),
    [password, contextualInputs]
  );
  const showWeakAction = password.length >= PASSWORD_MIN_LENGTH && strength.requiresExplicitConfirmation;
  const inputClass = 'mt-2 h-12 w-full border border-neutral-200 bg-neutral-50 px-4 pr-12 text-sm text-neutral-950 outline-none focus:border-neutral-900';

  return (
    <>
      <label className="block">
        <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500">New Password</span>
        <span className="relative block">
          <input type={visible ? 'text' : 'password'} name="newPassword" required minLength={PASSWORD_MIN_LENGTH} maxLength={PASSWORD_MAX_LENGTH} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} />
          <button type="button" onClick={() => setVisible((value) => !value)} className="absolute right-0 top-2 flex h-12 w-12 items-center justify-center text-neutral-500" aria-label={visible ? 'Hide password' : 'Show password'}>{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
        </span>
      </label>

      {password && (
        <div className="border border-neutral-200 bg-neutral-50 p-4" role="status" aria-live="polite">
          <div className="flex items-center justify-between gap-3"><span className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-700">{labels[strength.category]}</span><span className="text-sm font-black text-neutral-950">{strength.percent}%</span></div>
          <div className="mt-3 grid grid-cols-5 gap-1.5">{[0, 1, 2, 3, 4].map((segment) => <span key={segment} className={`h-1.5 ${segment <= strength.score ? 'bg-[#E02424]' : 'bg-neutral-200'}`} />)}</div>
          {strength.recommendations.length > 0 && <ul className="mt-3 space-y-1 text-xs leading-5 text-neutral-600">{strength.recommendations.map((item) => <li key={item}>• {item}</li>)}</ul>}
        </div>
      )}

      <label className="block">
        <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500">Confirm New Password</span>
        <input type={visible ? 'text' : 'password'} name="confirmPassword" required minLength={PASSWORD_MIN_LENGTH} maxLength={PASSWORD_MAX_LENGTH} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className={inputClass} />
        {confirmation && confirmation !== password && <span className="mt-2 block text-xs text-[#E02424]">Passwords do not match.</span>}
      </label>

      <button type="submit" name="acceptWeakPassword" value={showWeakAction || weakConfirmationRequested ? 'true' : 'false'} className={`inline-flex h-12 w-full items-center justify-center gap-2 px-5 text-xs font-bold uppercase tracking-[0.18em] text-white transition-colors disabled:cursor-not-allowed disabled:bg-neutral-400 ${showWeakAction || weakConfirmationRequested ? 'bg-[#E02424] hover:bg-red-700' : 'bg-neutral-900 hover:bg-neutral-700'}`}>
        {showWeakAction || weakConfirmationRequested ? <><ShieldAlert className="h-4 w-4" /> Use weak password anyway</> : 'Save new password'}
      </button>
    </>
  );
}
