# Eventra — Production Readiness Audit

**Date:** 2026-09-08
**Scope:** Full repository review (Next.js 15 / React 19 app, Drizzle + Supabase Postgres, Clerk auth, Dodo Payments)
**Reviewer:** Automated audit (Claude Code), manual code inspection — no fixes applied
**Method:** Static review of auth, payments, webhooks, rate limiting, config, and cross-cutting pattern search (secrets, `any` usage, error handling, raw SQL, `dangerouslySetInnerHTML`). This is not a substitute for a penetration test, load test, or `npm audit` remediation pass — see "Suggested Next Steps."

> This document only records findings. No code has been changed as part of this audit.

---

## Severity legend

| Severity | Meaning |
|---|---|
| 🔴 Critical | Exploitable in production, or causes data/financial loss. Fix before launch. |
| 🟠 High | Significant risk (security, correctness, or integrity) under realistic conditions. Fix before launch. |
| 🟡 Medium | Real bug or gap, but lower likelihood/impact, or needs specific conditions. Fix soon after launch. |
| 🔵 Low | Code quality, maintainability, or hardening. Fix opportunistically. |

---

## 1. Summary

| Severity | Count |
|---|---|
| 🔴 Critical | 2 |
| 🟠 High | 5 |
| 🟡 Medium | 6 |
| 🔵 Low | 6 |

The application has solid foundations (Clerk auth, Zod-validated env, DOMPurify on rendered HTML, HMAC-signed QR payloads, webhook signature verification, CSP headers, per-scope rate limiting). The issues below are concentrated in **secret fallback behavior**, **check-then-act race conditions around finite resources (capacity, promo usage)**, and **gaps in environment validation** — all classic pre-production hardening gaps rather than architectural problems.

---

## 2. Critical Findings

### 🔴 C1. Hardcoded fallback secret for ticket QR/entry-code signing
**File:** `src/core/utils/crypto.ts:3-9`

```ts
function getEffectiveSecret(): string {
  const secret = process.env.QR_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    console.warn('[crypto] QR_SECRET is not configured in environment, using fallback.');
  }
  return secret || 'eventra-dev-only-not-for-production';
}
```

If `QR_SECRET` is not set at deploy time, ticket QR codes are signed (HMAC-SHA256) with a **hardcoded string that is committed to the public/private source tree**. This is only a `console.warn`, not a hard failure — the app boots and serves traffic normally.

**Impact:** Anyone who can read this source file (contributors, forks, a leaked build, or just this audit) can forge a valid `TKT-XXXX:signature` QR payload for **any** ticket number and walk into any event, because `verifyTicket()` will accept it. This directly defeats the purpose of `signTicket`/`verifyTicket`.

**Why it matters for production:** `QR_SECRET` is marked `optional()` in `src/lib/env.ts:22`, so there is nothing in the deployment pipeline that would catch a missing value before go-live.

**Recommendation:** Make `QR_SECRET` mandatory in production (fail `getServerEnv()`/app boot if missing when `NODE_ENV === 'production'`), and throw instead of silently falling back.

---

### 🔴 C2. Optional `CRON_SECRET` leaves the lifecycle cron endpoint unauthenticated by default
**Files:** `src/app/api/cron/lifecycle/route.ts:22-29`, `src/lib/env.ts:18`

```ts
if (cronSecret && cronSecret !== providedSecret) {
  return NextResponse.json({ success: false, error: 'Unauthorized...' }, { status: 401 });
}
```

The check only enforces auth **if `CRON_SECRET` happens to be set**. If it's not configured (it's `optional()` in the env schema, with no production-only enforcement), `POST /api/cron/lifecycle` is a **public, unauthenticated endpoint** that anyone can call repeatedly to:
- Force-transition events between `published` → `active` → `completed` ahead of schedule.
- Trigger mass feedback emails to all attendees of every "completed" event, on demand, unlimited times (no rate limit on this route).
- Expire waitlist reservations early.

**Recommendation:** Require `CRON_SECRET` at boot in production (same pattern as C1); reject the request outright if the secret isn't configured server-side rather than treating "no secret configured" as "no auth required."

---

## 3. High Findings

### 🟠 H1. Race condition (TOCTOU) on event/tier capacity allows overselling
**Files:** `src/app/actions/registrations.ts` (~line 88), `src/app/actions/payments.ts:40-42, 144-149`

Capacity is checked with a plain `SELECT` **before** the `db.transaction(...)` that inserts the ticket and increments `registeredCount`:

```ts
} else if (event.capacity !== -1 && event.registeredCount >= event.capacity) {
  ...
}
// ... later, in a separate transaction:
await db.transaction(async (tx) => {
  await tx.insert(tickets).values({ ... });
  await tx.update(events).set({ registeredCount: sql`${events.registeredCount} + 1` })...
});
```

Two concurrent registration requests near the capacity limit can both read `registeredCount < capacity`, both pass the check, and both insert — oversubscribing the event/tier. This is the classic check-then-act race and is realistic for popular free events or tier drops where many users register at once.

The same pattern repeats for:
- `ticketTiers.registeredCount` (registrations.ts)
- `payments.ts::processFreeRegistration` and `handlePaymentWebhook`

**Recommendation:** Move the capacity check inside the same transaction using a conditional update (`UPDATE events SET registered_count = registered_count + 1 WHERE id = $1 AND (capacity = -1 OR registered_count < capacity) RETURNING *`) and treat "0 rows returned" as sold-out, instead of a separate read-then-write.

---

### 🟠 H2. Same TOCTOU pattern on promo code usage limits
**File:** `src/app/actions/promo-codes.ts:132`

```ts
if (promo.maxUses && promo.usedCount >= promo.maxUses) { ... }
```

`usedCount` is checked in `validateAndApplyPromoCode` separately from wherever it gets incremented (presumably at order completion). If two checkouts using the last remaining use of a promo code complete concurrently, both can pass validation — the code can be used more times than `maxUses` allows. Same fix pattern as H1 (atomic conditional update at the point of redemption, not at validation time).

---

### 🟠 H3. Ticket tier price is not honored by the paid checkout flow
**File:** `src/app/actions/payments.ts:11-117` (`createCheckoutSession`), `183-240` (`handlePaymentWebhook`)

`createCheckoutSession(eventId, tierId)` accepts a `tierId` but the Dodo Payments product/checkout is always created using `event.price` — the selected tier's price is never looked up or applied. `tierId` is only passed through as opaque `metadata`. Then `handlePaymentWebhook` inserts the ticket with `price: event.price` and never joins `tierId` into the tier's price or capacity accounting (contrast with `registrations.ts`, which does update `ticketTiers.registeredCount` for the *free* registration path).

**Impact:** For any event with paid ticket tiers (e.g., "Early Bird" vs "VIP"), every paid attendee is charged the base `event.price`, tier capacity is never decremented for paid purchases, and the ticket row has no tier association. This looks like an incomplete feature rather than a one-line bug — flag before launch if tiered paid tickets are meant to be supported.

---

### 🟠 H4. Webhook secrets are not part of the validated environment schema
**File:** `src/lib/env.ts` vs. `src/app/api/webhooks/clerk/route.ts:9`, `src/app/api/webhooks/dodo/route.ts:12`

`serverEnvSchema` validates `CRON_SECRET`, `JWT_SECRET`, etc., but **not** `CLERK_WEBHOOK_SECRET` or `DODO_PAYMENTS_WEBHOOK_SECRET` — the two secrets that authenticate inbound payment and user-sync webhooks. Each route re-reads `process.env` directly and handles the missing case inconsistently:
- Clerk webhook: throws an uncaught `Error` (results in a generic 500, but at least fails closed).
- Dodo webhook: only fails closed if `NODE_ENV === 'production'`; in any other `NODE_ENV` value (e.g., a misconfigured "staging" env that isn't exactly `"production"`), it **skips signature verification entirely** and trusts the raw request body.

**Recommendation:** Add both secrets to `serverEnvSchema` as required in production, and centralize the "skip verification" decision so it can't silently apply to a staging/preview deployment that isn't literally `NODE_ENV=production`.

---

### 🟠 H5. Unrestricted client-side file upload
**File:** `src/lib/storage.ts:9-42`

`uploadFile()` uploads directly from the browser to Supabase Storage with **no file type, extension, or size validation** on the client, and the effective access control is whatever the Supabase bucket's RLS/policy allows (not reviewed as part of this audit — flagged as a dependency to verify). On upload failure, it silently falls back to `URL.createObjectURL(file)`:

```ts
} catch (error) {
  console.error('Error uploading to Supabase Storage:', error);
  return URL.createObjectURL(file);
}
```

That blob URL is only valid in the uploading browser tab/session — if this return value is persisted anywhere (profile image, event banner, etc.) it will produce a broken image for every other user and on reload, with no visible error to the user who uploaded it.

**Recommendation:** Validate MIME type/extension and size before upload; don't silently swap in a non-persistent object URL as if it were a successful upload — surface the failure to the caller instead.

---

## 4. Medium Findings

### 🟡 M1. Content-Security-Policy is report-only unless `CSP_ENFORCE=true`
**File:** `next.config.ts:80-104`

The CSP header is `Content-Security-Policy-Report-Only` by default and only becomes enforcing when the `CSP_ENFORCE` env var is explicitly set. There's no reminder/enforcement mechanism ensuring this gets flipped for the production deploy — easy to forget, and an unenforced CSP provides no actual XSS mitigation. Also note the policy includes `'unsafe-inline' 'unsafe-eval'` in `script-src`, which will remain necessary until nonce-based script loading is implemented.

### 🟡 M2. `handlePaymentWebhook` never reconciles the amount paid against the expected price
**File:** `src/app/actions/payments.ts:183-240`

The webhook grants a ticket based solely on `metadata.userId`/`metadata.eventId` from the payload, without checking the amount actually paid (`payload.data.amount` or similar) against `event.price` (or the tier price — see H3). Signature verification (in the route handler) prevents a third party from forging the webhook, but there's no defense-in-depth check that the paid amount matches what was expected, e.g. against a Dodo Payments account-level pricing bug, a race between price changes and in-flight checkouts, or a manually-crafted checkout at the API level.

### 🟡 M3. DB connection silently falls back to an invalid connection string
**File:** `src/lib/db/index.ts:9-21`

```ts
const connectionString = poolerUrl ?? databaseUrl ?? 'postgresql://invalid:invalid@localhost:5432/eventra';
if (!databaseUrl && !poolerUrl) {
  console.warn('DATABASE_URL is not set. DB-backed routes may be unavailable.');
}
```

If neither `DATABASE_URL` nor `DATABASE_POOLER_URL` is set, the app still boots and only fails later, per-request, with a confusing connection error deep in `postgres-js`, instead of failing fast at startup with a clear message. `getServerEnv()` in `env.ts` *would* catch this (it requires `DATABASE_URL`), but `src/lib/db/index.ts` reads `process.env` directly rather than going through the validated env module, so the two are inconsistent — a code path that imports `db` without first calling `getServerEnv()` bypasses validation entirely.

### 🟡 M4. Low-entropy numeric entry codes
**File:** `src/core/utils/crypto.ts:60-62`

```ts
export function generateEntryCode(): string {
  return randomInt(100000, 1000000).toString();
}
```

6-digit numeric codes (~900,000 possible values) are used as a manual entry-code fallback for check-in (`src/app/api/tickets/verify/route.ts`). The route does rate-limit per staff member (30/min), but there's no lockout/backoff tied to the *code being guessed* (as opposed to the guesser), and no monitoring flagged for repeated invalid-code attempts against a single event. Low risk on its own, but combine with C1/C2 above and it's worth tightening (e.g., alphanumeric codes, or shorter TTL).

### 🟡 M5. Dependency vulnerabilities in production dependency tree
**Source:** `npm audit --omit=dev`

75 vulnerabilities reported (61 moderate, 14 high), rooted mainly in transitive `google-cloud`/`googleapis` packages (`google-gax`, `googleapis-common`, `teeny-request`, `retry-request`, all pulled in via `uuid`/`firebase-admin`-adjacent chains, likely via `genkit`/`@genkit-ai/googleai`). Run `npm audit` and review/patch before production launch; a full remediation pass was out of scope for this document.

### 🟡 M6. Silently swallowed errors around secondary side-effects
**Files:** multiple, e.g. `src/app/actions/registrations.ts`, `src/app/actions/event-lifecycle.ts:130, 162`

Patterns like `.catch(() => {})` and `.catch((err) => logger.warn(...))` around notification inserts and emails are reasonable for non-critical side effects, but there are enough of them scattered through the checkout/registration/lifecycle code that a systemic failure (e.g., `notifications` table down, or a schema drift) could go unnoticed in production with no alerting — worth a monitoring/alerting pass on `logger.error`/`logger.warn` output before launch, since `logger.ts` only writes structured JSON to stdout and doesn't forward to any external monitoring service today.

---

## 5. Low / Code Quality Findings

### 🔵 L1. Heavy use of `any` (479 occurrences across `src/`)
Widespread use of `: any` / `as any` bypasses TypeScript's type safety in exactly the layers (server actions, DB inserts) where correctness matters most for a production financial/ticketing system. Not a bug by itself, but it materially raises the chance that a future refactor introduces a real one undetected by `tsc`.

### 🔵 L2. Thin automated test coverage relative to surface area
17 test files exist (`vitest`) covering mostly pure utility functions (crypto, calendar links, pathfinding, promo-code math, badge generation). The ~50 files under `src/app/actions/` (registrations, payments, check-in, admin, payouts) and 22 API routes are almost entirely untested — including the exact capacity/race-condition-prone code paths flagged in H1/H2. CI (`.github/workflows/ci.yml`) runs lint, typecheck, `vitest run`, and `build`, but with this little coverage those gates mostly catch syntax/type errors, not logic regressions.

### 🔵 L3. `console.log`/`console.warn`/`console.error` used directly outside `logger.ts` in ~10+ places
e.g. `src/lib/auth-utils.ts`, `src/lib/storage.ts`, `src/app/actions/ai-tools.ts`. Bypasses the structured JSON logging `logger.ts` provides for production, making these lines harder to query/alert on in a log aggregator.

### 🔵 L4. `env:check` / `env:check:staging` scripts exist but aren't wired into CI or the build
**Files:** `scripts/check-env.mjs`, `package.json`. These look purpose-built to catch exactly the "missing secret in production" class of issue described in C1/C2/H4, but nothing currently runs them automatically before/during deploy.

### 🔵 L5. CORS `Access-Control-Allow-Origin` falls back to `localhost:9002` if unset
**File:** `next.config.ts:66-74`. If `ALLOWED_ORIGINS`/`NEXT_PUBLIC_APP_URL` isn't set in the production environment, the API's CORS header advertises `http://localhost:9002` with `Access-Control-Allow-Credentials: true`. Low practical risk (this only affects browser-enforced cross-origin requests, and most of the app's own API consumption is same-origin), but it's a sign the env var isn't guaranteed to be set for prod — worth adding to required-env validation alongside C1/C2/H4.

### 🔵 L6. `.env.local` present locally but correctly git-ignored
Verified `.env*` is in `.gitignore` and `git ls-files` shows no tracked env files — **no secret leak found in git history for the currently tracked files**. Listed here only as a confirmed-clean item, not an issue — worth keeping as a standing check (e.g., a pre-commit hook or CI secret-scan) since C1/H4 show the project already has at least one secret that *shouldn't* have a source-code fallback.

---

## 6. What was checked and came back clean

- **SQL injection:** All `sql\`...\`` usage found (registrations, analytics, promo codes, ai-recommendations, etc.) uses Drizzle's tagged-template parameter binding — no raw string concatenation into SQL was found.
- **XSS:** All 4 `dangerouslySetInnerHTML` usages were reviewed — one is a JSON-LD `<script>` schema block (safe, non-HTML), one is chart theme CSS from shadcn (no user input), and two are certificate HTML rendering, both passed through `DOMPurify.sanitize()` first.
- **Webhook signature verification:** Both Clerk and Dodo Payments webhooks verify signatures via `svix` before trusting the payload (see H4 for the config-completeness caveat).
- **Route-level authorization:** Spot-checked ~15 API routes and ~50 server actions; the large majority call `requireAuth` / `validateRole` / `validateEventOwnership` / `validateStaffPermission` or Clerk's `auth()` before doing privileged work. The two apparent gaps (`event-lifecycle.ts`, cron trigger) are addressed in C2.
- **Secrets in git:** No `.env*` files are tracked; `.gitignore` covers them correctly.
- **Rate limiting:** A real per-identifier, per-scope, DB-backed rate limiter (`src/lib/rate-limit.ts`) is applied to expensive/abusable actions (AI calls, ticket verification, general server actions via `guardExpensiveAction`).

---

## 7. Suggested Next Steps (not performed as part of this audit)

1. Fix C1 and C2 first — both are trivial to fix (fail fast on missing secret in production) and both are outright security holes if missed.
2. Decide whether tiered paid ticketing (H3) is in scope for launch; if yes it needs implementation work, not just a fix.
3. Convert the capacity/usage-limit checks (H1, H2) to atomic conditional updates before any real traffic hits capacity-constrained events.
4. Run `npm audit fix` (or review each high-severity advisory manually) and re-run `npm audit --omit=dev` to confirm.
5. Wire `scripts/check-env.mjs` into CI/deploy so a missing required production secret fails the build instead of the first real user interaction.
6. This document did not include a dedicated pass on: WebRTC virtual stage (`src/features/stage`), payouts/financial ledger correctness (`src/app/actions/payouts.ts`), i18n message completeness, accessibility, or a load/performance test — recommend a follow-up pass on payouts specifically given it's financial code, before launch.
