# Authentication Architecture

This document describes the high-level architecture of the CWS Next App authentication system.

## Design Philosophy
The system is built specifically for a **Next.js App Router** environment deployed to a **Serverless Platform** (e.g., Vercel, Netlify). 
The core design principles are:
1. **Serverless Compatibility**: No long-running servers, VPS, or Redis are required. State is persisted in MongoDB.
2. **Fixed Users**: No public registration. The user base is fixed and controlled by administrators.
3. **Database-Backed Sessions**: Allows administrators to revoke sessions globally and instantly.
4. **Defense-in-Depth**: Robust fail-closed behaviors for all secrets, Argon2 peppering, and rate-limiting.

## Technology Stack

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | Next.js App Router | Handling Server Actions, Server Components, and client rendering. |
| **Database** | MongoDB | Primary persistence store for users, sessions, MFA credentials, and audit logs. |
| **Passwords** | `argon2` | Secure password hashing, augmented by a server-side pepper (`ARGON2_SECRET`). |
| **MFA (WebAuthn)** | `@simplewebauthn/server` | Biometrics, passkeys, and hardware security keys. |
| **MFA (TOTP)** | `otplib` (v13+) | Authenticator app code generation and verification. |

## Separation of Concerns
The `src/auth/` directory strictly enforces separation of concerns to keep the codebase maintainable and secure.

### 1. Data Access Layer (`src/auth/dal.ts`)
The DAL acts as the single boundary for components needing to read authentication state. It provides methods like `getAuthSession()`, `requireAuth()`, and `requireRole()`. It utilizes React's `cache()` to deduplicate DB queries for the session within the same render pass.

### 2. Actions (`src/auth/actions/`)
Next.js Server Actions serve as the bridge between client forms and backend services. They handle input validation (using Zod), invoke the appropriate service, and return a serializable result or error back to the client.

### 3. Services (`src/auth/services/`)
This is where the core business logic resides (e.g., `login.service.ts`, `mfa.service.ts`, `session.service.ts`). Services do not know about HTTP requests or cookies; they operate purely on strongly-typed inputs and interact with Repositories.

### 4. Repositories (`src/auth/repositories/`)
Repositories encapsulate all MongoDB database interactions (`user.repository.ts`, `session.repository.ts`, etc.). This isolates database queries from business logic.

## Security Overview
- **Argon2 Peppering**: Passwords are hashed with an application-wide secret. If the database is compromised but the environment variables are not, the passwords remain highly resistant to cracking.
- **Fail-Closed Configuration**: The application refuses to boot in production if critical security variables (`SESSION_SECRET`, `SECURE_COOKIES`, `ARGON2_SECRET`) are missing or misconfigured.
- **Strict Role-Based Access (RBAC)**: Enforced centrally via the DAL (`requireRole`).
