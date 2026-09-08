# Audit Remediation Log

This document tracks the fixes applied to the production readiness audit report.

## Critical Issues

### [Fixed] C1. Hardcoded fallback secret for ticket QR/entry-code signing
- **Issue**: `QR_SECRET` had a fallback to a hardcoded string when missing in production, allowing forged tickets.
- **Fix**: Modified `src/core/utils/crypto.ts` to explicitly `throw new Error()` if `QR_SECRET` is not set when `NODE_ENV === 'production'`. Also updated `src/lib/env.ts` to require `QR_SECRET` dynamically based on the environment.
- **Commit/Date**: 2026-09-08

### [Fixed] C2. Optional `CRON_SECRET` leaves the lifecycle cron endpoint unauthenticated by default
- **Issue**: `CRON_SECRET` was optional, allowing public triggering of the event lifecycle cron if left unconfigured.
- **Fix**: Updated `src/app/api/cron/lifecycle/route.ts` to return a `500` error if the secret is missing in production, and strictly enforce authentication if in production or a local secret is provided. Required `CRON_SECRET` dynamically in `src/lib/env.ts` when `NODE_ENV === 'production'`.
- **Commit/Date**: 2026-09-08

## High Findings

### [Fixed] H1. Race condition (TOCTOU) on event/tier capacity allows overselling
- **Issue**: Event-level capacity was already fixed with an atomic conditional `UPDATE` (prior commit), but the ticket-tier `registeredCount` increment right after it in `registerForEvent` was still a plain `UPDATE` with no re-checked `WHERE` clause — two concurrent registrations for the same tier could both pass the earlier read-based check and both increment, overselling the tier. `processFreeRegistration` and `handlePaymentWebhook` in `payments.ts` had the same gap for both event and tier capacity.
- **Fix**: Applied the same atomic re-check pattern (`UPDATE ... WHERE capacity = -1 OR registered_count < capacity RETURNING *`, treat zero rows as sold-out) to the tier update in `src/app/actions/registrations.ts`, and to both event and tier capacity in `src/app/actions/payments.ts`.
- **Commit/Date**: 2026-09-09

### [Fixed] H2. Same TOCTOU pattern on promo code usage limits
- **Issue**: `usedCount` was only ever read (in `validateAndApplyPromoCode`), never incremented anywhere in the codebase — promo code redemption isn't wired into any checkout/registration path yet (see H3 note below), so `maxUses` was effectively unenforceable.
- **Fix**: Added `redeemPromoCode()` in `src/app/actions/promo-codes.ts` — an atomic conditional `UPDATE` that only increments `usedCount` while still under `maxUses`/active/unexpired, meant to be called inside the same transaction that finalizes the order. Wired into `handlePaymentWebhook` (reads `promoCodeId` from webhook metadata, same pattern as `tierId`).
- **Follow-up needed**: promo codes are still only a client-side "preview discount" in `event-details-client.tsx` — `createCheckoutSession`/`processFreeRegistration` don't yet accept a `promoCodeId` param, so the discount isn't actually applied to what's charged. Wiring that through is a small UI + action-signature change once someone picks it up.
- **Commit/Date**: 2026-09-09

### [Fixed] H3. Ticket tier price is not honored by the paid checkout flow
- **Issue**: `createCheckoutSession` always priced the Dodo product at `event.price` regardless of the selected tier, and `handlePaymentWebhook` inserted tickets at `event.price` with no `tierId` association or tier capacity accounting.
- **Fix**: `createCheckoutSession` now looks up the tier (when `tierId` is passed), validates its capacity, prices the Dodo product from `tier.price`, and creates a tier-specific product (doesn't reuse/overwrite the event's cached `externalId`, which is priced at the base rate). `handlePaymentWebhook` now applies the tier's price, persists `tierId` on the ticket row, and atomically decrements tier capacity.
- **Also found while fixing**: neither `handlePaymentWebhook` nor `processFreeRegistration` was writing a signed `qrCode` onto the ticket (unlike `registerForEvent`), so entry verification would have failed for every paid or webhook-issued free ticket. Fixed by generating the QR payload on insert in both.
- **Note**: `createCheckoutSession` still isn't called from any UI component — the "Register" button in `event-details-client.tsx` always goes through the free-registration path regardless of `event.price`. Per the audit's suggested next steps, whether tiered/paid checkout is in scope for launch is a product decision, not something to silently wire up as part of a security fix pass — flagging for explicit sign-off before building the checkout UI.
- **Commit/Date**: 2026-09-09

### [Fixed] H4. Webhook secrets are not part of the validated environment schema
- **Issue**: `CLERK_WEBHOOK_SECRET` and `DODO_PAYMENTS_WEBHOOK_SECRET` weren't in `serverEnvSchema`. The Dodo webhook route also only fail-closed when `NODE_ENV` was the exact literal `'production'` — any other value (unset, `staging`, etc.) with the secret missing skipped signature verification entirely.
- **Fix**: Added both secrets to `serverEnvSchema` as production-required (same pattern as `QR_SECRET`/`CRON_SECRET`). Changed the Dodo webhook route's fallback check from `NODE_ENV === 'production'` (fail-closed only in prod) to `NODE_ENV !== 'development'` (fail-closed everywhere except an explicit local dev run).
- **Commit/Date**: 2026-09-09

### [Fixed] H5. Unrestricted client-side file upload
- **Issue**: `uploadFile()` in `src/lib/storage.ts` had no MIME type or size validation, and silently fell back to `URL.createObjectURL(file)` on any upload error — a blob URL that only resolves in the uploading tab, so if persisted (profile photo, banner) it renders broken for everyone else.
- **Fix**: Added an image-MIME-type allowlist and a 10MB size cap, checked before upload. Upload failures now `throw` instead of being swallowed; callers already had `try/catch` around it except `event-map-editor.tsx`, which got one added.
- **Note**: bucket-level access control (Supabase RLS/policy) was explicitly out of scope for the original audit and still hasn't been reviewed here — flagged as a dependency to verify separately.
- **Commit/Date**: 2026-09-09

## Medium Findings

### [Fixed] M1. Content-Security-Policy is report-only unless `CSP_ENFORCE=true`
- **Fix**: `next.config.ts` now defaults to enforcing CSP in production (`CSP_ENFORCE=false` still available to opt back into report-only for a staging rollout). `'unsafe-inline'`/`'unsafe-eval'` remain in `script-src` (Next's bootstrap needs them until nonce-based script loading exists), but enforcing still blocks script/connect/frame sources outside the explicit allowlist, which report-only mode never blocked.
- **Commit/Date**: 2026-09-09

### [Fixed] M2. `handlePaymentWebhook` never reconciles the amount paid against the expected price
- **Fix**: `createCheckoutSession` now passes `expectedAmount` through checkout metadata; `handlePaymentWebhook` compares it against the settled amount from the webhook payload (checking a few plausible field names, since the exact Dodo payload shape wasn't available to verify against) and logs an error on mismatch rather than hard-rejecting, given the field name is a best-effort guess. Signature verification still stops third-party forgery; this adds a logged tripwire for a stale price/account-level pricing bug.
- **Commit/Date**: 2026-09-09

### [Fixed] M3. DB connection silently falls back to an invalid connection string
- **Fix**: `src/lib/db/index.ts` now throws at module load if neither `DATABASE_URL` nor `DATABASE_POOLER_URL` is set and `NODE_ENV === 'production'`, instead of booting and failing later per-request against the placeholder connection string.
- **Commit/Date**: 2026-09-09

### [Not fixed — no safe automated fix] M5. Dependency vulnerabilities in production dependency tree
- **Checked**: `npm audit --omit=dev` still reports 75 vulnerabilities (61 moderate, 14 high), all rooted in a `uuid` bounds-check advisory pulled in transitively through the `@google-cloud/*` / `googleapis` chain (via `genkit`/`@genkit-ai/googleai`). Every advisory in the tree says "No fix available"; `npm audit fix` makes no changes, and `npm audit fix --force` would force major-version bumps to `genkit`/`firebase-admin`-adjacent packages with unverified compatibility (this environment can't exercise the AI features to confirm nothing breaks).
- **Recommendation stands as-is**: needs a deliberate upgrade/compatibility pass on the genkit/AI dependency chain, not a blind forced fix.

### [Deferred — needs a product decision] M4. Low-entropy numeric entry codes
- Left as-is: the 6-digit code is displayed as a "PIN" in the UI (`printable-badge-card.tsx`, ticket views) and is meant to be easy to read/type at check-in. Switching to a higher-entropy format is a UX trade-off worth a deliberate call, not a silent change during a security pass. Existing per-staff rate limiting (30/min) partially mitigates this.

### [Deferred] M6. Silently swallowed errors around secondary side-effects
- Not addressed — needs a monitoring/alerting decision (where do `logger.error`/`logger.warn` outputs get forwarded to?) that's out of scope for a code-only fix pass.

## Low / Code Quality Findings

- **L1** (479 `any` usages), **L2** (thin test coverage on actions/routes), **L3** (~10 direct `console.*` calls outside `logger.ts`): not addressed in this pass — all three are broad, low-risk-individually cleanups better suited to dedicated follow-up work than bundled into a security-fix branch.
- **L4** (`env:check` scripts not wired into CI): not wired up — doing so would need `DATABASE_URL`/other staging secrets configured as CI secrets, which wasn't available to set up here. Left as a documented follow-up: add a step running `node scripts/check-env.mjs --mode staging` (or similar) once those secrets exist in the CI environment.
- **L5. CORS `Access-Control-Allow-Origin` falls back to `localhost:9002` if unset**: **Fixed**. `next.config.ts` now omits the CORS headers entirely on `/api/*` when `ALLOWED_ORIGINS`/`NEXT_PUBLIC_APP_URL` isn't configured, instead of advertising a permissive `localhost:9002` origin with credentials allowed.
- **L6**: no action needed (already confirmed clean by the audit).

## Found while testing (not in the original audit)

### [Fixed] Production build was broken
- **Issue**: `src/app/actions/payouts.ts` is a `'use server'` file but also exported a non-async const (`PLATFORM_FEE_RATE`, `MIN_PAYOUT_AMOUNT`) and a sync function (`computePlatformFee`) — Next.js only allows async function exports (and types) from `'use server'` files, so `npm run build` failed outright with "Only async functions are allowed to be exported in a 'use server' file." This blocked any production build on this branch, independent of the audit fixes.
- **Fix**: Moved the pure fee-math helpers to `src/core/utils/payouts.ts` (no `'use server'` directive) and updated `payouts.ts` and `payouts.test.ts` to import from there.
- **Commit/Date**: 2026-09-09

### [Fixed] Paid/webhook-issued tickets had no QR code
- Covered under H3 above — `handlePaymentWebhook` and `processFreeRegistration` weren't generating a signed `qrCode` on ticket insert, unlike `registerForEvent`. Entry verification (`verifyTicket`) would have rejected these tickets at check-in.

## Verification
- `npx tsc --noEmit`, `npm run lint`, `npm run test` (86/86 passing), and `npm run build` all pass as of the last commit in this remediation pass.
- No UI testing was performed for the flows touched (upload validation, checkout tier pricing) since the paid-checkout UI isn't wired up yet (see H3 note) — recommend a manual pass through image upload flows (event form, onboarding, chat, map editor) before shipping.
