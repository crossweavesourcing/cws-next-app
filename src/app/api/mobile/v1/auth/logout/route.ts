import { hashToken } from '@/auth/crypto/token';
import { RefreshTokenRepository } from '@/auth/repositories/refresh-token.repository';
import { SessionService } from '@/auth/services/session.service';
import { LogoutService } from '@/auth/services/logout.service';
import { mobileJson, mobileOptions, requireJson } from '@/auth/lib/mobile';

export const runtime = 'nodejs';

export function OPTIONS(request: Request) { return mobileOptions(request); }

export async function POST(request: Request) {
  if (!requireJson(request)) return mobileJson(request, { error: 'Content-Type must be application/json.' }, { status: 415 });
  let body: { refreshToken?: unknown };
  try { body = await request.json() as typeof body; } catch { return mobileJson(request, { error: 'Invalid request.' }, { status: 400 }); }
  if (typeof body.refreshToken !== 'string') return mobileJson(request, { ok: true });
  const hash = hashToken(body.refreshToken);
  const repo = new RefreshTokenRepository();
  const token = await repo.findByHash(hash);
  if (token) {
    const session = await new SessionService().getSessionById(token.sessionId);
    if (session?.platform === 'mobile') {
      await new LogoutService().logout(session._id);
      await repo.revokeBySession(session._id, 'logout');
    }
  }
  return mobileJson(request, { ok: true });
}
