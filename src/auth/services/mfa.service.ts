import { TOTP, NobleCryptoPlugin, ScureBase32Plugin } from 'otplib';
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';
import type { VerifiedRegistrationResponse, VerifiedAuthenticationResponse, GenerateRegistrationOptionsOpts, GenerateAuthenticationOptionsOpts } from '@simplewebauthn/server';
import { ObjectId } from 'mongodb';
import { MfaRepository } from '../repositories/mfa.repository';
import { UserRepository } from '../repositories/user.repository';
import { getEnv } from '../config/env';

const rpName = 'CWS Next App';
const rpID = process.env.NODE_ENV === 'production' ? 'your-domain.com' : 'localhost';
const origin = process.env.NODE_ENV === 'production' ? `https://${rpID}` : `http://${rpID}:3000`;

const totp = new TOTP({
  crypto: new NobleCryptoPlugin(),
  base32: new ScureBase32Plugin()
});

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
    const secret = await this.mfaRepo.getTotpSecret(userId);
    if (!secret) return false;
    const result = await totp.verify(token, { secret });
    return result.valid;
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

    const options: GenerateRegistrationOptionsOpts = {
      rpName,
      rpID,
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
  async verifyWebAuthnRegistration(userId: ObjectId, body: any, expectedChallenge: string): Promise<boolean> {
    let verification: VerifiedRegistrationResponse;
    try {
      verification = await verifyRegistrationResponse({
        response: body,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
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

    const options: GenerateAuthenticationOptionsOpts = {
      rpID,
      allowCredentials: userPasskeys.map((passkey) => ({
        id: passkey.credentialID,
        type: 'public-key',
        transports: passkey.transports as any,
      })),
    };

    return generateAuthenticationOptions(options);
  }

  /**
   * Verifies a WebAuthn authentication response.
   */
  async verifyWebAuthnAuthentication(userId: ObjectId, body: any, expectedChallenge: string): Promise<boolean> {
    const passkey = await this.mfaRepo.getWebAuthnCredentialById(body.id);
    if (!passkey || !passkey.userId.equals(userId)) return false;

    let verification: VerifiedAuthenticationResponse;
    try {
      verification = await verifyAuthenticationResponse({
        response: body,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
          id: passkey.credentialID,
          publicKey: Buffer.from(passkey.credentialPublicKey, 'base64url'),
          counter: passkey.counter,
          transports: passkey.transports as any,
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
