import { getEnv } from '../config/env';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface MailMessage {
  to: string;
  subject: string;
  /** Plain-text body. */
  text: string;
  /** Optional HTML body. */
  html?: string;
}

/**
 * Lazily-created Nodemailer Gmail transport (singleton).
 * Returns null when email env vars are not configured, so callers fall back to
 * console logging in development rather than crashing.
 */
let transporter: Transporter | null | undefined;

function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;

  const env = getEnv();
  if (env.EMAIL_USER && env.EMAIL_PASSWORD) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: env.EMAIL_USER, pass: env.EMAIL_PASSWORD },
    });
  } else {
    transporter = null;
  }
  return transporter;
}

/**
 * Email sending port. Uses Nodemailer + Gmail SMTP when EMAIL_USER /
 * EMAIL_PASSWORD / EMAIL_FROM are configured. In development (no provider
 * configured) it logs the message (including any 2FA code / reset link) to the
 * server console. No phone/SMS path exists by design — all out-of-band
 * challenges are email-based.
 *
 * A transient email failure is logged but never thrown, so it cannot block a
 * login or password reset.
 */
export async function sendMail(message: MailMessage): Promise<void> {
  const env = getEnv();
  const mailer = getTransporter();

  if (!mailer || !env.EMAIL_FROM) {
    // Dev / unconfigured: surface the message for manual testing.
    console.info(
      `[mail:dev] to=${message.to} subject=${message.subject}\n${message.text}`
    );
    return;
  }

  try {
    await mailer.sendMail({
      from: env.EMAIL_FROM,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  } catch (err) {
    console.error(
      `[mail:error] failed to send to=${message.to} subject=${message.subject}:`,
      err instanceof Error ? err.message : err
    );
  }
}
