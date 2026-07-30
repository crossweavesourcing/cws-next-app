import { TOTP, NobleCryptoPlugin, ScureBase32Plugin } from 'otplib';
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';
import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  GenerateAuthenticationOptionsOpts,
  GenerateRegistrationOptionsOpts,
  RegistrationResponseJSON,
  VerifiedAuthenticationResponse,
  VerifiedRegistrationResponse,
} from '@simplewebauthn/server';
import { ObjectId } from 'mongodb';
import { MfaRepository } from '../repositories/mfa.repository';
import { UserRepository } from '../repositories/user.repository';
import { DeviceRepository } from '../repositories/device.repository';
import { getWebAuthnConfig } from '../config/env';
import type { DeviceDocument, WebAuthnCredentialDocument } from '@/types/auth';

const rpName = 'CWS Next App';

const totp = new TOTP({
  crypto: new NobleCryptoPlugin(),
  base32: new ScureBase32Plugin()
});

const TOTP_PERIOD_SECONDS = 30;

export interface PasskeySummary {
  id: string;
  name: string | null;
  credentialDeviceType: string | null;
  credentialBackedUp: boolean | null;
  transports: string[];
  deviceObjectId: string | null;
  deviceName: string | null;
  deviceType: string | null;
  browser: string | null;
  operatingSystem: string | null;
  trusted: boolean | null;
  blocked: boolean | null;
  lastUsedAt: string | null;
  createdAt: string;
}

function webAuthnUserId(userId: ObjectId): string {
  return Buffer.from(new TextEncoder().encode(userId.toString())).toString('base64url');
}

function toPasskeySummary(passkey: WebAuthnCredentialDocument, device: DeviceDocument | null = null): PasskeySummary {
  return {
    id: passkey._id.toHexString(),
    name: passkey.name,
    credentialDeviceType: passkey.credentialDeviceType,
    credentialBackedUp: passkey.credentialBackedUp,
    transports: passkey.transports,
    deviceObjectId: passkey.deviceObjectId?.toHexString() ?? null,
    deviceName: device?.name ?? null,
    deviceType: device?.type ?? null,
    browser: device?.browser ?? null,
    operatingSystem: device?.operatingSystem ?? null,
    trusted: device?.trusted ?? null,
    blocked: device?.blocked ?? null,
    lastUsedAt: passkey.lastUsedAt?.toISOString() ?? null,
    createdAt: passkey.createdAt.toISOString(),
  };
}

export class MfaService {
  private mfaRepo = new MfaRepository();
  private userRepo = new UserRepository();

  // ─── TOTP ────────────────────────────────────────────────────────────

  /**
   * Generates a new TOTP secret for the user, returning the raw secret and an otpauth:// URL
   * for QR code generation. Does NOT enable TOTP for the user yet.
   */
  async generateTotpSecret(userId: ObjectId, userEmail: string): Promise<{ secret: string; otpauthUrl: string }> {
    const secret = totp.generateSecret();
    const otpauthUrl = totp.toURI({ label: userEmail, issuer: rpName, secret });
    return { secret, otpauthUrl };
  }

  /**
   * Verifies the first TOTP code using the provided secret. If valid, saves the secret
   * and sets totpEnabled = true for the user.
   */
  async verifyAndEnableTotp(userId: ObjectId, secret: string, token: string): Promise<boolean> {
    const result = await totp.verify(token, { secret });
    if (!result.valid) return false;

    await this.mfaRepo.saveTotpSecret(userId, secret);
    await this.userRepo.updateSecurity(userId, { totpEnabled: true, mfaEnabled: true });
    return true;
  }

  /**
   * Verifies a TOTP code during login.
   */
  async verifyTotpLogin(userId: ObjectId, token: string): Promise<boolean> {
    const credential = await this.mfaRepo.getTotpCredential(userId);
    if (!credential?.secret) return false;
    const result = await totp.verify(token, {
      secret: credential.secret,
      period: TOTP_PERIOD_SECONDS,
      afterTimeStep: credential.lastAcceptedTimeStep ?? undefined,
    });
    if (!result.valid) return false;

    // Persist the timestep the verifier actually accepted. This remains correct
    // if a bounded clock-skew window is configured in the future.
    return this.mfaRepo.markTotpTimeStepAccepted(userId, result.timeStep);
  }

  async disableTotp(userId: ObjectId): Promise<void> {
    await this.mfaRepo.removeTotpSecret(userId);

    await this.userRepo.updateSecurity(userId, { totpEnabled: false, mfaEnabled: false });
  }

  // ─── WEBAUTHN ────────────────────────────────────────────────────────

  /**
   * Starts a WebAuthn registration flow. Returns options to pass to the client.
   */
  async generateWebAuthnRegistrationOptions(userId: ObjectId, userEmail: string) {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new Error('User not found');

    const userPasskeys = await this.mfaRepo.getWebAuthnCredentials(userId);
    const webAuthn = getWebAuthnConfig();

    const options: GenerateRegistrationOptionsOpts = {
      rpName: webAuthn.rpName,
      rpID: webAuthn.rpID,
      userID: new TextEncoder().encode(userId.toString()),
      userName: userEmail,
      // Require users to use a discoverable credential (passkey)
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'preferred',
      },
      // Prevent users from re-registering existing authenticators
      excludeCredentials: userPasskeys.map((passkey) => ({
        id: passkey.credentialID,
        type: 'public-key',
        transports: passkey.transports as AuthenticatorTransportFuture[],
      })),
    };

    return generateRegistrationOptions(options);
  }

  /**
   * Verifies a WebAuthn registration response and saves the credential.
   */
  async verifyWebAuthnRegistration(
    userId: ObjectId,
    body: RegistrationResponseJSON,
    expectedChallenge: string,
    deviceObjectId: ObjectId | null
  ): Promise<boolean> {
    if (!deviceObjectId) return false;
    const webAuthn = getWebAuthnConfig();
    let verification: VerifiedRegistrationResponse;
    try {
      verification = await verifyRegistrationResponse({
        response: body,
        expectedChallenge,
        expectedOrigin: webAuthn.origin,
        expectedRPID: webAuthn.rpID,
        requireUserVerification: false,
      });
    } catch (error) {
      console.error('WebAuthn registration verification failed:', error instanceof Error ? error.name : 'UnknownError');
      return false;
    }

    const { verified, registrationInfo } = verification;
    if (verified && registrationInfo) {
      const { credential, credentialDeviceType } = registrationInfo;
      const { id: credentialID, publicKey: credentialPublicKey, counter } = credential;
      
      await this.mfaRepo.saveWebAuthnCredential(userId, {
        credentialID,
        credentialPublicKey: Buffer.from(credentialPublicKey).toString('base64url'),
        webauthnUserID: webAuthnUserId(userId),
        deviceObjectId,
        counter,
        credentialDeviceType,
        credentialBackedUp: registrationInfo.credentialBackedUp,
        transports: body.response.transports || [],
        name: `${credentialDeviceType} passkey`,
      });

      await this.userRepo.updateSecurity(userId, { webAuthnEnabled: true });
      return true;
    }
    return false;
  }

  /**
   * Starts a WebAuthn authentication flow.
   */
  async generateWebAuthnAuthenticationOptions(userId: ObjectId) {
    const userPasskeys = await this.mfaRepo.getWebAuthnCredentials(userId);
    const webAuthn = getWebAuthnConfig();

    const options: GenerateAuthenticationOptionsOpts = {
      rpID: webAuthn.rpID,
      userVerification: 'preferred',
      allowCredentials: userPasskeys.map((passkey) => ({
        id: passkey.credentialID,
        type: 'public-key',
        transports: passkey.transports as AuthenticatorTransportFuture[],
      })),
    };

    return generateAuthenticationOptions(options);
  }

  /**
   * Verifies a WebAuthn authentication response.
   */
  async verifyWebAuthnAuthentication(
    userId: ObjectId,
    body: AuthenticationResponseJSON,
    expectedChallenge: string,
    deviceObjectId: ObjectId | null
  ): Promise<boolean> {
    if (!deviceObjectId) return false;
    const passkey = await this.mfaRepo.getWebAuthnCredentialById(body.id);
    if (!passkey || !passkey.userId.equals(userId)) return false;
    if (!passkey.deviceObjectId || !passkey.deviceObjectId.equals(deviceObjectId)) {
      return false;
    }
    const webAuthn = getWebAuthnConfig();

    let verification: VerifiedAuthenticationResponse;
    try {
      verification = await verifyAuthenticationResponse({
        response: body,
        expectedChallenge,
        expectedOrigin: webAuthn.origin,
        expectedRPID: webAuthn.rpID,
        credential: {
          id: passkey.credentialID,
          publicKey: Buffer.from(passkey.credentialPublicKey, 'base64url'),
          counter: passkey.counter,
          transports: passkey.transports as AuthenticatorTransportFuture[],
        },
        requireUserVerification: false,
      });
    } catch (error) {
      console.error('WebAuthn authentication verification failed:', error instanceof Error ? error.name : 'UnknownError');
      return false;
    }

    const { verified, authenticationInfo } = verification;
    if (verified && authenticationInfo) {
      await this.mfaRepo.updateWebAuthnCredentialUsage(passkey._id, authenticationInfo.newCounter);
      return true;
    }
    return false;
  }

  async generateWebAuthnPasswordlessOptions(userId: ObjectId, deviceObjectId: ObjectId) {
    const userPasskeys = await this.mfaRepo.getWebAuthnCredentialsForDevice(userId, deviceObjectId);
    if (userPasskeys.length === 0) return null;
    const webAuthn = getWebAuthnConfig();
    return generateAuthenticationOptions({
      rpID: webAuthn.rpID,
      userVerification: 'required',
      allowCredentials: userPasskeys.map((passkey) => ({
        id: passkey.credentialID,
        type: 'public-key',
        transports: passkey.transports as AuthenticatorTransportFuture[],
      })),
    });
  }

  async verifyWebAuthnPasswordlessAuthentication(
    body: AuthenticationResponseJSON,
    expectedChallenge: string,
    deviceObjectId: ObjectId | null,
    expectedUserId?: ObjectId
  ): Promise<{ userId: ObjectId } | { error: 'device_mismatch' } | null> {
    if (!deviceObjectId) return { error: 'device_mismatch' };
    const passkey = await this.mfaRepo.getWebAuthnCredentialById(body.id);
    if (!passkey) return null;
    if (expectedUserId && !passkey.userId.equals(expectedUserId)) return null;
    if (!passkey.deviceObjectId || !passkey.deviceObjectId.equals(deviceObjectId)) {
      return { error: 'device_mismatch' };
    }
    const webAuthn = getWebAuthnConfig();

    let verification: VerifiedAuthenticationResponse;
    try {
      verification = await verifyAuthenticationResponse({
        response: body,
        expectedChallenge,
        expectedOrigin: webAuthn.origin,
        expectedRPID: webAuthn.rpID,
        credential: {
          id: passkey.credentialID,
          publicKey: Buffer.from(passkey.credentialPublicKey, 'base64url'),
          counter: passkey.counter,
          transports: passkey.transports as AuthenticatorTransportFuture[],
        },
        requireUserVerification: true,
      });
    } catch (error) {
      console.error('WebAuthn authentication verification failed:', error instanceof Error ? error.name : 'UnknownError');
      return null;
    }

    const { verified, authenticationInfo } = verification;
    if (!verified || !authenticationInfo) return null;
    await this.mfaRepo.updateWebAuthnCredentialUsage(passkey._id, authenticationInfo.newCounter);
    return { userId: passkey.userId };
  }

  async listWebAuthnCredentials(userId: ObjectId): Promise<PasskeySummary[]> {
    const passkeys = await this.mfaRepo.getWebAuthnCredentials(userId);
    const deviceRepo = new DeviceRepository();
    const summaries = await Promise.all(passkeys.map(async (passkey) => {
      const device = passkey.deviceObjectId
        ? await deviceRepo.findByServerDeviceId(passkey.deviceObjectId, userId)
        : null;
      return toPasskeySummary(passkey, device);
    }));
    return summaries;
  }

  async renameWebAuthnCredential(userId: ObjectId, credentialDbId: ObjectId, name: string | null): Promise<boolean> {
    const normalized = name?.trim() ? name.trim().slice(0, 80) : null;
    return this.mfaRepo.renameWebAuthnCredential(credentialDbId, userId, normalized);
  }

  async removeWebAuthnCredential(userId: ObjectId, credentialDbId: ObjectId): Promise<void> {
    await this.mfaRepo.removeWebAuthnCredential(credentialDbId, userId);
    
    const remaining = await this.mfaRepo.getWebAuthnCredentials(userId);
    if (remaining.length === 0) {
      const user = await this.userRepo.findById(userId);
      const totpEnabled = user?.security?.totpEnabled ?? false;
      await this.userRepo.updateSecurity(userId, {
        webAuthnEnabled: false,
        mfaEnabled: totpEnabled,
      });
    }
  }
}
