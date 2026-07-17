# Authentication Workflows

This document outlines the step-by-step logic and sequence of operations for the primary authentication workflows in the application.

## 1. Password Login

The password login flow ensures the user exists, verifies the Argon2 hash against the stored hash + server pepper, and establishes a secure session.

```mermaid
sequenceDiagram
    participant Client
    participant Action as login.ts (Server Action)
    participant Service as login.service.ts
    participant DB as MongoDB
    
    Client->>Action: submit(email, password)
    Action->>Service: authenticate(email, password)
    Service->>DB: findUserByEmail(email)
    DB-->>Service: User Document
    Service->>Service: verifyArgon2(password, hash, pepper)
    
    alt Success
        Service->>DB: createSession(userId)
        Service->>Action: session data
        Action->>Client: set cws_session cookie, redirect
    else Failure
        Service->>Action: throw InvalidCredentialsError
        Action->>Client: show error
    end
```

## 2. Google OAuth Login

Google OAuth uses the Authorization Code flow. We do not support public registration, so if a user signs in with Google but their email is not present in our database, they are rejected.

```mermaid
sequenceDiagram
    participant Client
    participant Service as oauth.service.ts
    participant Google
    participant DB as MongoDB

    Client->>Google: redirect to Google login
    Google-->>Client: callback with code
    Client->>Service: handleCallback(code)
    Service->>Google: exchange code for tokens
    Google-->>Service: id_token (with email)
    Service->>DB: findUserByEmail(email)
    
    alt User Exists
        Service->>DB: createSession(userId)
        Service->>Client: set cws_session cookie, redirect
    else User Does Not Exist
        Service->>Client: reject (Unauthorized)
    end
```

## 3. WebAuthn (Passkeys)

We use `@simplewebauthn/server` for passkeys. 

```mermaid
sequenceDiagram
    participant Client
    participant Service as mfa.service.ts
    participant DB as MongoDB
    
    Client->>Service: requestAuthenticationOptions()
    Service->>DB: getWebAuthnCredentials(userId)
    Service-->>Client: challenge & options
    Client->>Client: prompt biometrics/key
    Client->>Service: verifyAuthenticationResponse(response)
    Service->>Service: simplewebauthn.verifyAuthenticationResponse()
    alt Verified
        Service->>DB: createSession(userId)
        Service-->>Client: success & set cookie
    end
```

## 4. Step-Up MFA

Step-Up MFA is triggered when a user logs in from a **new device** or a **new country/location**. When this happens, their session is created but marked as pending, and they must verify a code (via Email/TOTP/WebAuthn) before the session becomes fully active.

```mermaid
sequenceDiagram
    participant LoginService
    participant SessionService
    participant Client
    
    LoginService->>SessionService: checkDeviceHistory(ip, userAgent)
    alt New Device or Location
        SessionService->>LoginService: requireStepUp = true
    end
    LoginService->>Client: redirect to /dashboard/verify-2fa (Session Pending)
    Client->>LoginService: submit 2FA code
    LoginService->>SessionService: upgradeSessionToActive()
    SessionService->>Client: redirect to /dashboard
```
