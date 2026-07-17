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
import { getWebAuthnConfig } from '../config/env';

const rpName = 'CWS Next App';

const totp = new TOTP({
  crypto: new NobleCryptoPlugin(),
  base32: new ScureBase32Plugin()
});

const TOTP_PERIOD_SECONDS = 30;

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
    
    // Check if webauthn is still enabled to determine if mfaEnabled should remain true
    const user = await this.userRepo.findById(userId);
    const webAuthnEnabled = user?.security?.webAuthnEnabled ?? false;
    
    await this.userRepo.updateSecurity(userId, { totpEnabled: false, mfaEnabled: webAuthnEnabled });
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
    expectedChallenge: string
  ): Promise<boolean> {
    const webAuthn = getWebAuthnConfig();
    let verification: VerifiedRegistrationResponse;
    try {
      verification = await verifyRegistrationResponse({
        response: body,
        expectedChallenge,
        expectedOrigin: webAuthn.origin,
        expectedRPID: webAuthn.rpID,
      });
    } catch (error) {
      console.error('WebAuthn registration verification failed:', error);
      return false;
    }

    const { verified, registrationInfo } = verification;
    if (verified && registrationInfo) {
      const { credential, credentialDeviceType } = registrationInfo;
      const { id: credentialID, publicKey: credentialPublicKey, counter } = credential;
      
      await this.mfaRepo.saveWebAuthnCredential(userId, {
        credentialID,
        credentialPublicKey: Buffer.from(credentialPublicKey).toString('base64url'),
        counter,
        transports: body.response.transports || [],
        name: `${credentialDeviceType} passkey`,
      });

      await this.userRepo.updateSecurity(userId, { webAuthnEnabled: true, mfaEnabled: true });
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
    expectedChallenge: string
  ): Promise<boolean> {
    const passkey = await this.mfaRepo.getWebAuthnCredentialById(body.id);
    if (!passkey || !passkey.userId.equals(userId)) return false;
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
      });
    } catch (error) {
      console.error('WebAuthn authentication verification failed:', error);
      return false;
    }

    const { verified, authenticationInfo } = verification;
    if (verified && authenticationInfo) {
      await this.mfaRepo.updateWebAuthnCredentialUsage(passkey._id, authenticationInfo.newCounter);
      return true;
    }
    return false;
  }

  async removeWebAuthnCredential(userId: ObjectId, credentialDbId: ObjectId): Promise<void> {
    await this.mfaRepo.removeWebAuthnCredential(credentialDbId, userId);
    
    const remaining = await this.mfaRepo.getWebAuthnCredentials(userId);
    if (remaining.length === 0) {
      const user = await this.userRepo.findById(userId);
      const totpEnabled = user?.security?.totpEnabled ?? false;
      await this.userRepo.updateSecurity(userId, { webAuthnEnabled: false, mfaEnabled: totpEnabled });
    }
  }
}
