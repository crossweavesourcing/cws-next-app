import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';
import { getEnv } from '../config/env';
import { verifyMobileAccessToken } from '../services/mobile-token.service';
import { SessionService } from '../services/session.service';
import { UserRepository } from '../repositories/user.repository';
import type { SessionDocument, UserDocument, CmsPermission } from '@/types/auth';
import { ADMIN_IMPLICIT_PERMISSIONS } from '@/types/auth';

export function mobileCorsHeaders(request: Request): Headers {
  const headers = new Headers();
  const origin = request.headers.get('origin');
  const allowed = getEnv().MOBILE_ALLOWED_ORIGINS;
  if (origin && allowed.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Vary', 'Origin');
    headers.set('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    headers.set('Access-Control-Max-Age', '600');
  }
  return headers;
}

export function mobileJson<T>(request: Request, body: T, init: ResponseInit = {}): NextResponse<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  for (const [key, value] of mobileCorsHeaders(request)) headers.set(key, value);
  return NextResponse.json(body, { ...init, headers });
}

export function requireJson(request: Request): boolean {
  return (request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json');
}

export function mobileOptions(request: Request): NextResponse {
  return new NextResponse(null, { status: 204, headers: mobileCorsHeaders(request) });
}

export async function authenticateBearerRequest(request: NextRequest): Promise<{
  user: UserDocument;
  session: SessionDocument;
} | null> {
  const header = request.headers.get('authorization');
  if (!header || !/^Bearer\s+\S+$/i.test(header)) return null;
  const token = header.replace(/^Bearer\s+/i, '').trim();
  try {
    const claims = await verifyMobileAccessToken(token);
    const sessionId = new ObjectId(claims.sid);
    const userId = new ObjectId(claims.sub);
    const session = await new SessionService().getSessionById(sessionId);
    if (!session || session.revoked || !session.userId.equals(userId) || session.platform !== 'mobile') return null;
    if (session.expiresAt <= new Date()) return null;
    const user = await new UserRepository().findById(userId);
    if (!user || user.status !== 'active') return null;
    if (
      user.security?.accountSecurityVersion !== null &&
      session.accountSecurityVersion !== null &&
      user.security.accountSecurityVersion !== session.accountSecurityVersion
    ) return null;
    return { user, session };
  } catch {
    return null;
  }
}

/** Accept the existing web cookie or a mobile bearer JWT for shared APIs. */
export async function authenticateCookieOrBearer(request: NextRequest): Promise<{
  session: SessionDocument;
  user: UserDocument;
} | null> {
  const bearer = await authenticateBearerRequest(request);
  if (bearer) return bearer;
  const { getAuthSession, getAuthUser } = await import('../dal');
  const session = await getAuthSession();
  if (!session) return null;
  const user = await getAuthUser(session.userId);
  if (!user || user.status !== 'active') return null;
  return { session, user };
}

export function hasCmsPermission(user: UserDocument, permission: CmsPermission): boolean {
  if (user.role === 'super_admin') return true;
  if (user.role === 'admin') return ADMIN_IMPLICIT_PERMISSIONS.includes(permission);
  return user.permissions?.includes(permission) ?? false;
}
