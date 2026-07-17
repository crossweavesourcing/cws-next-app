# Route Protection

This application utilizes Next.js App Router but deliberately **avoids using a global `middleware.ts`** for asserting authentication. Instead, route protection is executed explicitly within the Server Components, Server Actions, and Route Handlers by interacting with the Data Access Layer (`src/auth/dal.ts`).

## The Data Access Layer (`dal.ts`)

The DAL centralizes authorization logic. The cornerstone of the DAL is `getAuthSession()`.

### `getAuthSession()`
Retrieves the session from the `cws_session` cookie and validates it against the database. 
Crucially, this function is wrapped in React's `cache()`. This means if `getAuthSession()` is called 5 times during the render of a single page (e.g., in a layout, a page, and three child components), the database query only runs **once**.

## Guard Functions

The DAL exposes three primary guards to protect routes:

### 1. `requireAuth()`
Used when a route just needs the user to be logged in, regardless of their role.
```typescript
import { requireAuth } from '@/auth/dal'

export default async function DashboardPage() {
  const session = await requireAuth(); // Redirects to /dashboard/login if unauthenticated
  return <div>Welcome!</div>;
}
```

### 2. `requireActiveSession()`
Used for routes that should be completely blocked if the user is currently forced to change their password (e.g., `user.security.forcePasswordChange === true`).
```typescript
import { requireActiveSession } from '@/auth/dal'

export default async function NormalPage() {
  // Redirects to /dashboard/change-password if a forced reset is pending
  const session = await requireActiveSession(); 
  return <div>Active!</div>;
}
```

### 3. `requireRole(role: UserRole)`
Used to assert Role-Based Access Control (RBAC). 
```typescript
import { requireRole } from '@/auth/dal'

export async function submitAdminForm(data: FormData) {
  // Throws InsufficientRoleError if the user is not an admin
  const session = await requireRole('admin'); 
  // ... proceed ...
}
```
**Note:** The system uses a strict role-string check. The `admin` role is treated as a superuser and always passes authorization, whereas other roles require an exact string match.

## Why no `middleware.ts`?
Next.js Edge Middleware does not support raw Node.js APIs or standard MongoDB drivers. Because our sessions are completely database-backed to allow for instant revocation, session verification requires a database round-trip. Using the React `cache()` pattern in Server Components provides the same security guarantees as middleware while remaining fully compatible with Node.js standard libraries and MongoDB drivers.
