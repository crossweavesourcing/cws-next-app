import { NextResponse } from 'next/server';
import { loginActionImpl } from '@/auth/actions/login';

export const runtime = 'nodejs';

function loginRedirect(request: Request, error: 'invalid' | 'blocked' | 'system') {
  return NextResponse.redirect(new URL(`/dashboard/login/?error=${error}`, request.url), 303);
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  const requestOrigin = new URL(request.url).origin;
  const isExplicitSameOrigin = origin !== null && origin !== 'null' && origin === requestOrigin;
  // Chromium can emit Origin:null for a native form navigation under the
  // dashboard's strict no-referrer policy. Sec-Fetch-* is browser-controlled
  // and cannot be forged by cross-site JavaScript, so accept only the exact
  // same-origin navigation combination as the fallback.
  const isSameOriginNavigation =
    origin === 'null' &&
    request.headers.get('sec-fetch-site') === 'same-origin' &&
    request.headers.get('sec-fetch-mode') === 'navigate';
  if (!isExplicitSameOrigin && !isSameOriginNavigation) {
    return loginRedirect(request, 'blocked');
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return loginRedirect(request, 'invalid');
  }

  const result = await loginActionImpl(undefined, formData);
  if (result?.redirect) {
    return NextResponse.redirect(new URL(result.redirect, request.url), 303);
  }
  if (result?.error === 'Request blocked.') return loginRedirect(request, 'blocked');
  if (result?.error === 'Invalid email address or password.') return loginRedirect(request, 'invalid');
  return loginRedirect(request, result?.error ? 'system' : 'invalid');
}
