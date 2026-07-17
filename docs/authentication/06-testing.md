# Testing Strategy

The authentication system is covered by rigorous automated testing, divided into unit tests and smoke tests.

## Test Location and Naming
Tests are co-located with the files they test in the `src/auth/` directory.
- **Unit Tests:** `*.unit.test.ts`
- **Smoke Tests:** `*.smoke.test.ts`

## 1. Unit Tests
Unit tests are responsible for testing the isolated business logic of the authentication services and repositories. They do not require a live database connection; they mock the database layer to ensure tests are fast and deterministic.

**Key Unit Test Suites:**
- `mfa.service.unit.test.ts`: Validates TOTP code generation, verification (using `otplib`), and WebAuthn challenges.
- `session.service.unit.test.ts`: Ensures session creation, timeout logic (idle vs absolute expiry), and step-up device detection operate correctly.
- `password.service.unit.test.ts`: Tests Argon2 hashing, peppering logic, and password policy enforcement.
- `rate-limit.service.unit.test.ts`: Verifies that brute-force attempts are properly throttled based on IP and User-Agent.

## 2. Smoke Tests
Smoke tests are higher-level integration tests that ensure the entire vertical slice of a feature works in a near-production environment. 
For example, `alerting.smoke.test.ts` ensures that the alerting service correctly formats and dispatches security alerts.

## Running Tests
We utilize `vitest` as our testing framework. You can execute the test suite using the standard NPM scripts defined in `package.json`:

```bash
# Run all unit tests
npm run test

# Run tests in watch mode (useful during development)
npm run test:watch
```

## Continuous Integration
These tests run on every pull request to ensure that refactoring or feature additions do not accidentally introduce security regressions into the authentication layer.
