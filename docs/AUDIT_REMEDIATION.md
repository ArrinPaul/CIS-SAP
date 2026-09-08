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
