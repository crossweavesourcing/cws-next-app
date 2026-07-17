// FIX-08: a precomputed Argon2id hash (matching our hash params) of a throwaway
// password. When the supplied email does not resolve to a user, we still run a
// dummy verify against this hash so the response time approximates the
// known-user (slow) path and does not leak which emails exist via timing.
export const DUMMY_HASH =
  '$argon2id$v=19$m=65536,t=3,p=1$pHSYuWHOqgw7GXN+1KfmPw$ughOfA+eIGDB3oro1ixcBwBR5OLy4IO0I6toi6bE9Os';
