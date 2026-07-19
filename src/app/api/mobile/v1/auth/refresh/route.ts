import { hashToken } from '@/auth/crypto/token';
import { RefreshTokenRepository } from '@/auth/repositories/refresh-token.repository';
import { SessionService } from '@/auth/services/session.service';
import { issueMobileAccessToken } from '@/auth/services/mobile-token.service';
import { getClientIp } from '@/auth/lib/request';
import { mobileJson, mobileOptions, requireJson } from '@/auth/lib/mobile';

export const runtime = 'nodejs';

export function OPTIONS(request: Request) { return mobileOptions(request); }

export async function POST(request: Request) {
  if (!requireJson(request)) return mobileJson(request, { error: 'Content-Type must be application/json.' }, { status: 415 });
  let body: { refreshToken?: unknown };
  try { body = await request.json() as typeof body; } catch { return mobileJson(request, { error: 'Invalid request.' }, { status: 400 }); }
  if (typeof body.refreshToken !== 'string' || body.refreshToken.length < 32) return mobileJson(request, { error: 'Invalid refresh token.' }, { status: 401 });

  const hash = hashToken(body.refreshToken);
  const repo = new RefreshTokenRepository();
  const prior = await repo.findByHash(hash);
  if (!prior) return mobileJson(request, { error: 'Session revoked.' }, { status: 401 });
  const session = await new SessionService().getSessionById(prior.sessionId);
  if (!session || session.platform !== 'mobile') return mobileJson(request, { error: 'Session revoked.' }, { status: 401 });

  const result = await new SessionService().rotateRefreshToken(hash, await getClientIp(), request.headers.get('user-agent'), null);
  if (!result || 'expired' in result) return mobileJson(request, { error: 'Session expired.' }, { status: 401 });
  const access = await issueMobileAccessToken(result.session.userId, result.session._id);
  return mobileJson(request, {
    status: 'authenticated',
    accessToken: access.token,
    refreshToken: result.refreshToken,
    expiresIn: access.expiresIn,
  });
}
