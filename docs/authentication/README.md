# CWS Next App: Authentication System

Welcome to the documentation for the CWS Next App Authentication System. 
This system is custom-built for a serverless Next.js App Router environment, utilizing MongoDB for persistence, Argon2 for password hashing, and supporting both Passkeys (WebAuthn) and TOTP for Multi-Factor Authentication.

## Documentation Index

You can read the entire suite of guides in one place or browse them individually:

- **[Consolidated Document (All Chapters)](./CONSOLIDATED.md)**: The complete documentation compiled into a single file.

Or browse chapter-by-chapter:

1. **[01. Architecture](./01-architecture.md)**: High-level design, technology stack, and separation of concerns.
2. **[02. Workflows](./02-workflows.md)**: Sequence diagrams of Login, OAuth, and MFA processes.
3. **[03. Route Protection](./03-route-protection.md)**: How routes are secured using the Data Access Layer (DAL) without global middleware.
4. **[04. Session Management](./04-session-management.md)**: Cookie security, database sessions, and revocation strategies.
5. **[05. Security Audit](./05-security-audit.md)**: In-depth analysis of attack vectors and mitigations (Argon2 peppering, rate limiting, step-up).
6. **[06. Testing](./06-testing.md)**: Unit and smoke testing strategies.
7. **[07. File Inventory](./07-file-inventory.md)**: A complete list of all files in `src/auth/` and their explicit purposes.
8. **[08. Environment Variables](./08-environment.md)**: Detailed breakdown of the fail-closed environment configuration.
9. **[09. Current Status](./09-status.md)**: Operational readiness and future recommendations.

## Core Features
- **Serverless First:** Designed specifically for Vercel/Netlify. No Redis or VPS required.
- **Defense in Depth:** Enforces strict HTTP-Only, Secure cookies and requires a server-side pepper for password hashing.
- **Step-Up MFA:** Automatically demands a second factor when a user attempts to log in from a new IP or geographical location.
