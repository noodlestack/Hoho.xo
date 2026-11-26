# Security Policy & Privacy Guarantees

Hoho.xo is built around strict anonymity for visitors and strong session isolation for tree owners.

## Reporting a Vulnerability

If you discover a security issue (XSS, CSRF bypass, session leak, rate-limit bypass, or privacy regression), please **do not open a public GitHub issue** with exploit details.

Instead, please contact **noodlestack** directly through GitHub private vulnerability reporting or email the maintainer listed on [github.com/noodlestack](https://github.com/noodlestack) with:

- A description of the vulnerability and affected route/module
- Minimal steps to reproduce
- Impact assessment

We aim to acknowledge reports within 48 hours and ship fixes promptly.

## Privacy & Anonymity Architecture

1. **Zero Visitor Sign-In & Zero Tracking**: Visitors never create accounts. Public `GET /api/trees/[handle]` and SSR `/t/[handle]` responses return only sanitized ornament coordinates and styles (`PublicOrnamentStub`)—never message text, read state, muted-word lists, or sender metadata.
2. **No Identity Hints**: No IP addresses, user-agent strings, referrers, or exact timestamps are ever displayed to tree owners, exposed in API payloads, or rendered onto Story card PNGs.
3. **Salted Rate-Limit Hashing**: Rate limits compute an HMAC-SHA256 digest of the client IP using `HOHO_IP_SALT` (`src/lib/rate-limit.ts`) with trusted proxy resolution (`HOHO_TRUSTED_PROXY`), never raw IP storage, and fail closed (`503`) if Upstash KV is unreachable in production.
4. **Owner Session Isolation**: Owner access uses a cryptographically random 48-char token stored hashed (SHA-256) server-side and set in an `HttpOnly`, `SameSite=Lax` cookie (`__Host-hoho_owner_{handle}` in production), never copied to `localStorage`. All owner mutations enforce `Origin`/`Referer` same-origin checks (`assertSameOrigin`).
5. **Generic Push Alerts**: Optional Web Push (`src/lib/push.ts`, `public/sw.js`) uses `web-push` with VAPID keys and `after()` coalescing (at most once per minute) and **never** includes message content in push notification payloads.
6. **Strict Self-Hosted CSP**: Runtime responses enforce `default-src 'self'`, `img-src 'self' data: blob:`, `connect-src 'self'`, `frame-ancestors 'none'`, `X-Frame-Options: DENY`, and `Strict-Transport-Security`.
