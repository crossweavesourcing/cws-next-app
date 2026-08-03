import { NextResponse } from 'next/server';
import { getClientIp } from '@/auth/lib/request';
import { UNTRUSTED_IP_SENTINEL } from '@/auth/lib/ip';

// In-memory caches for basic abuse prevention
const idempotencyCache = new Set<string>();
const ipRateLimit = new Map<string, { count: number, resetAt: number }>();

const MAX_REQUESTS_PER_IP = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// Simple HTML/script tag stripping helper
function sanitizeInput(str: string): string {
  if (!str) return '';
  return str
    .replace(/<[^>]*>/g, '') // Strip basic HTML tags
    .trim();
}

// Basic email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, company, subject, message, honeypot, idempotencyKey } = body;

    // Honeypot check
    if (honeypot) {
      return NextResponse.json({ success: true }); // pretend success for bots
    }

    // Idempotency check
    if (idempotencyKey) {
      if (idempotencyCache.has(idempotencyKey)) {
        return NextResponse.json({ success: true }); // already processed
      }
      idempotencyCache.add(idempotencyKey);
      // Clean up cache periodically (prevent memory leak)
      if (idempotencyCache.size > 1000) {
        const iterator = idempotencyCache.values();
        idempotencyCache.delete(iterator.next().value!);
      }
    }

    // IP Rate Limiting
    const ip = await getClientIp();
    if (ip !== UNTRUSTED_IP_SENTINEL) {
      const now = Date.now();
      const record = ipRateLimit.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
      
      if (now > record.resetAt) {
        record.count = 1;
        record.resetAt = now + RATE_LIMIT_WINDOW_MS;
      } else {
        record.count++;
      }
      
      ipRateLimit.set(ip, record);

      if (record.count > MAX_REQUESTS_PER_IP) {
        return NextResponse.json(
          { success: false, error: "Too many requests. Please try again later." },
          { status: 429 }
        );
      }
    }

    const targetUrl = process.env.GOOGLE_SCRIPT_URL;
    if (!targetUrl) {
      console.error("API Route error: GOOGLE_SCRIPT_URL env variable is not configured.");
      return NextResponse.json(
        { success: false, error: "Server configuration error. Please try again later." },
        { status: 500 }
      );
    }

    // 1. Sanitize inputs
    const sanitizedName = sanitizeInput(name);
    const sanitizedEmail = sanitizeInput(email);
    const sanitizedCompany = sanitizeInput(company || '');
    const sanitizedSubject = sanitizeInput(subject);
    const sanitizedMessage = sanitizeInput(message);

    // 2. Validate inputs
    if (!sanitizedName || !sanitizedEmail || !sanitizedSubject || !sanitizedMessage) {
      return NextResponse.json(
        { success: false, error: "All fields are required." },
        { status: 400 }
      );
    }

    if (sanitizedName.length > 100) {
      return NextResponse.json(
        { success: false, error: "Name must be under 100 characters." },
        { status: 400 }
      );
    }

    if (sanitizedEmail.length > 255 || !EMAIL_REGEX.test(sanitizedEmail)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (sanitizedSubject.length > 200) {
      return NextResponse.json(
        { success: false, error: "Subject must be under 200 characters." },
        { status: 400 }
      );
    }

    if (sanitizedMessage.length > 5000) {
      return NextResponse.json(
        { success: false, error: "Message must be under 5000 characters." },
        { status: 400 }
      );
    }

    // Prepare sanitized payload
    const sanitizedData = {
      name: sanitizedName,
      email: sanitizedEmail,
      company: sanitizedCompany,
      subject: sanitizedSubject,
      message: sanitizedMessage,
    };

    // 3. Send request to Google Sheets Script with AbortController timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8-second timeout

    try {
      const response = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sanitizedData),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Google API responded with status: ${response.status}`);
      }

      return NextResponse.json({ success: true });
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        console.error("Submission API error: Connection timed out to Google Sheets API.");
        return NextResponse.json(
          { success: false, error: "Request timed out connecting to Google Sheets. Please try again." },
          { status: 504 }
        );
      }

      console.error("Failed to submit to Google Sheets via API route:", error);
      return NextResponse.json(
        { success: false, error: "Failed to send message. Please try again." },
        { status: 502 }
      );
    }
  } catch (err: unknown) {
    console.error("Malformed request received in API route:", err);
    return NextResponse.json(
      { success: false, error: "Invalid request payload." },
      { status: 400 }
    );
  }
}
