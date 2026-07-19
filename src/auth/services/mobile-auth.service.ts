import { ObjectId } from 'mongodb';
import { generateToken, hashToken } from '../crypto/token';
import { LoginService } from './login.service';
import { OAuthService } from './oauth.service';
import { SessionService } from './session.service';
import { MfaService } from './mfa.service';
import { TwoFactorService } from './two-factor.service';
import { MobileChallengeRepository } from '../repositories/mobile-challenge.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { issueMobileAccessToken } from './mobile-token.service';
import type { LoginMethod, MobileMfaMethod } from '@/types/auth';

export type MobileAuthResult =
  | { status: 'authenticated'; accessToken: string; refreshToken: string; expiresIn: number; sessionId: string }
  | { status: 'mfa_required'; challengeToken: string; methods: string[]; expiresIn: number }
  | { status: 'force_change' };

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export class MobileAuthService {
  private loginService = new LoginService();
  private oauthService = new OAuthService();
  private sessionService = new SessionService();
  private mfaService = new MfaService();
  private twoFactorService = new TwoFactorService();
  private challengeRepo = new MobileChallengeRepository();
  private auditRepo = new AuditLogRepository();

  async passwordLogin(payload: unknown, ipAddress: string, userAgent: string | null): Promise<MobileAuthResult> {
    const result = await this.loginService.loginWithPassword(payload, ipAddress, userAgent, { platform: 'mobile' });
    if (result.status === 'authenticated') {
      return this.issue(result.sessionId, result.refreshToken);
    }
    if (result.status === 'mfa_required') {
      return this.createChallenge(result.userId, result.availableMethods as MobileMfaMethod[], ipAddress, userAgent, 'password');
    }
    return { status: 'force_change' };
  }

  async googleLogin(idToken: string, ipAddress: string, userAgent: string | null): Promise<MobileAuthResult> {
    const result = await this.oauthService.handleMobileIdToken(idToken, ipAddress, userAgent);
    if (result.status === 'authenticated') return this.issue(result.sessionId, result.refreshToken);
    if (result.status === 'mfa_required') {
      return this.createChallenge(result.userId, result.availableMethods as MobileMfaMethod[], ipAddress, userAgent, 'google');
    }
    return { status: 'force_change' };
  }

  async completeTotp(challengeToken: string, code: string, ipAddress: string, userAgent: string | null): Promise<MobileAuthResult | null> {
    const challenge = await this.challengeRepo.findActive(hashToken(challengeToken));
    if (!challenge || !challenge.methods.includes('totp')) return null;
    const ok = await this.mfaService.verifyTotpLogin(challenge.userId, code);
    if (!ok) {
      await this.challengeRepo.recordFailure(challenge.tokenHash);
      await this.auditFailure(challenge.userId, ipAddress, userAgent, 'totp');
      return null;
    }
    return this.redeemAndIssue(challenge.tokenHash, ipAddress, userAgent);
  }

  async completeEmail(challengeToken: string, code: string, ipAddress: string, userAgent: string | null): Promise<MobileAuthResult | null> {
    const challenge = await this.challengeRepo.findActive(hashToken(challengeToken));
    if (!challenge || !challenge.methods.includes('email')) return null;
    const ok = await this.twoFactorService.verify(challenge.userId, code);
    if (!ok) {
      await this.challengeRepo.recordFailure(challenge.tokenHash);
      return null;
    }
    return this.redeemAndIssue(challenge.tokenHash, ipAddress, userAgent);
  }

  async resendEmail(challengeToken: string): Promise<boolean> {
    const challenge = await this.challengeRepo.findActive(hashToken(challengeToken));
    if (!challenge || !challenge.methods.includes('email')) return false;
    await this.twoFactorService.sendCode(challenge.userId);
    return true;
  }

  async webAuthnOptions(challengeToken: string): Promise<unknown | null> {
    const challenge = await this.challengeRepo.findActive(hashToken(challengeToken));
    if (!challenge || !challenge.methods.includes('webauthn')) return null;
    const options = await this.mfaService.generateWebAuthnAuthenticationOptions(challenge.userId);
    await this.challengeRepo.setWebAuthnChallenge(challenge.tokenHash, options.challenge);
    return options;
  }

  async completeWebAuthn(
    challengeToken: string,
    response: Parameters<MfaService['verifyWebAuthnAuthentication']>[1],
    ipAddress: string,
    userAgent: string | null
  ): Promise<MobileAuthResult | null> {
    const challenge = await this.challengeRepo.findActive(hashToken(challengeToken));
    if (!challenge || !challenge.methods.includes('webauthn') || !challenge.webauthnChallenge) return null;
    const valid = await this.mfaService.verifyWebAuthnAuthentication(
      challenge.userId,
      response,
      challenge.webauthnChallenge
    );
    if (!valid) {
      await this.challengeRepo.recordFailure(challenge.tokenHash);
      await this.auditFailure(challenge.userId, ipAddress, userAgent, 'webauthn');
      return null;
    }
    return this.redeemAndIssue(challenge.tokenHash, ipAddress, userAgent);
  }

  private async createChallenge(
    userId: ObjectId,
    methods: MobileMfaMethod[],
    ipAddress: string,
    userAgent: string | null,
    loginMethod: LoginMethod
  ): Promise<MobileAuthResult> {
    const raw = generateToken(32);
    const challenge = await this.challengeRepo.create({
      tokenHash: hashToken(raw),
      userId,
      loginMethod,
      methods: methods.length ? methods : ['email'],
      expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
      ipAddress,
      userAgent,
    });
    if (challenge.methods.includes('email')) {
      await this.twoFactorService.sendCode(userId);
    }
    return { status: 'mfa_required', challengeToken: raw, methods: challenge.methods, expiresIn: 300 };
  }

  private async redeemAndIssue(tokenHash: string, ipAddress: string, userAgent: string | null): Promise<MobileAuthResult | null> {
    const challenge = await this.challengeRepo.redeem(tokenHash);
    if (!challenge) return null;
    const result = await this.sessionService.createSession(
      challenge.userId,
      ipAddress,
      userAgent,
      challenge.loginMethod,
      null,
      { platform: 'mobile' }
    );
    if (result.status !== 'authenticated') return null;
    return this.issue(result.sessionId, result.refreshToken);
  }

  private async issue(sessionId: string, refreshToken: string): Promise<MobileAuthResult> {
    const session = await this.sessionService.getSessionById(new ObjectId(sessionId));
    if (!session) throw new Error('Session creation failed.');
    const access = await issueMobileAccessToken(session.userId, session._id);
    return { status: 'authenticated', accessToken: access.token, refreshToken, expiresIn: access.expiresIn, sessionId };
  }

  private async auditFailure(userId: ObjectId, ipAddress: string, userAgent: string | null, method: string): Promise<void> {
    await this.auditRepo.log({
      userId,
      sessionId: null,
      action: 'auth.mfa.failed',
      status: 'FAILURE',
      errorCode: 'AUTH_MOBILE_MFA_INVALID',
      actor: { type: 'user', id: userId },
      source: { platform: 'mobile', appVersion: '0.1.0' },
      correlationId: null,
      requestId: null,
      resource: null,
      metadata: { method },
      ipAddress,
      userAgent,
    });
  }
}
