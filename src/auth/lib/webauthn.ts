import * as z from 'zod/v4';
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from '@simplewebauthn/server';

const ClientExtensionResultsSchema = z.record(z.string(), z.unknown()).optional();

export const WebAuthnRegistrationResponseSchema = z.object({
  id: z.string().min(1),
  rawId: z.string().min(1),
  response: z.object({
    attestationObject: z.string().min(1),
    clientDataJSON: z.string().min(1),
    transports: z.array(z.string()).optional(),
  }),
  type: z.literal('public-key'),
  clientExtensionResults: ClientExtensionResultsSchema,
  authenticatorAttachment: z.string().optional(),
});

export const WebAuthnAuthenticationResponseSchema = z.object({
  id: z.string().min(1),
  rawId: z.string().min(1),
  response: z.object({
    authenticatorData: z.string().min(1),
    clientDataJSON: z.string().min(1),
    signature: z.string().min(1),
    userHandle: z.string().optional(),
  }),
  type: z.literal('public-key'),
  clientExtensionResults: ClientExtensionResultsSchema,
  authenticatorAttachment: z.string().optional(),
});

export function parseRegistrationResponse(value: unknown): RegistrationResponseJSON | null {
  const parsed = WebAuthnRegistrationResponseSchema.safeParse(value);
  return parsed.success ? parsed.data as RegistrationResponseJSON : null;
}

export function parseAuthenticationResponse(value: unknown): AuthenticationResponseJSON | null {
  const parsed = WebAuthnAuthenticationResponseSchema.safeParse(value);
  return parsed.success ? parsed.data as AuthenticationResponseJSON : null;
}

export function challengeFromClientDataJSON(clientDataJSON: string): string | null {
  try {
    const decoded = Buffer.from(clientDataJSON, 'base64url').toString('utf8');
    const parsed = JSON.parse(decoded) as { challenge?: unknown };
    return typeof parsed.challenge === 'string' ? parsed.challenge : null;
  } catch {
    return null;
  }
}
