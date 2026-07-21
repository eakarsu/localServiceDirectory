# Completeness Review: localServiceDirectory

**Review date:** 2026-07-18

## Assessment basis

Static inspection of project-owned source and configuration only; no dependency installation, build, database migration, external-service call, or runtime launch was performed. The scan considered 179 project files (161 source files), 1 manifest(s), 0 test-like file(s), and 0 CI workflow(s), excluding dependency/generated directories.

## Classification

**Functional but incomplete**

This is a substantive but unfinished field/local services application, not just an empty scaffold. Inspection found 161 source files across `src/`, `prisma/` using Next.js, React, Prisma; however, the checked-in workflow and delivery controls do not yet demonstrate a complete, production-operable product.

## Why it is not complete

- Generated gap/visualization routes describe missing capabilities or simulate recommendations; they do not implement the underlying domain operation.
- Generic LLM calls are used as product behavior without enough typed tools, grounded evidence, deterministic rules, or output evaluation.
- Mock, demo, sample, fixture, or placeholder behavior remains in executable/product paths.
- No recognizable project-owned automated tests were found for the main workflow.
- No checked-in CI workflow proves builds, tests, migrations, and security checks on every change.

## Needed features

1. Implement quote, availability, booking, dispatch, job status, change-order, invoice, payment, and cancellation lifecycles.
2. Add technician/resource skills, travel/service-area constraints, inventory, customer communications, and offline recovery.
3. Integrate maps, calendar, messaging, payment, tax, and accounting providers with idempotent webhooks.
4. Test overbooking, no-shows, partial work, refunds, rescheduling, and technician reassignment end to end.
5. Add risk-based unit, integration, and end-to-end tests in CI, including migration and failure-path coverage.

## Risks or launch blockers

- Automation contains destructive process, filesystem, or database operations; do not run it on a shared machine without review.
- Startup appears coupled to seed/migration behavior, risking data mutation or non-repeatable launches.
- AI-provider availability, cost, privacy, prompt injection, and unvalidated output are launch risks until bounded and evaluated.
- Regression risk is high because no recognizable project-owned automated tests cover the main path.

## Evidence inspected

- `README.md`
- `src/app/api/gap-no-background-check-vetting-workflow/route.ts:3`
- `src/app/page.tsx:64`
- `src/app/error.tsx`
- `package.json`
- `start.sh`

## Recommended next action

Choose one real field/local services journey, define acceptance criteria and external contracts, then close its persistence, permission, integration, failure, and test gaps before expanding features.

## Implementation progress (2026-07-20)

- Implemented a persistent, permission-checked field-service journey covering quote request/response/acceptance, accepted-quote booking, capacity and service-area validation, technician assignment/reassignment, dispatch and job transitions, no-show/rescheduling, change orders, partial/completed work, invoices, payment authorization/capture, partial/full refunds, cancellation, audit events, and optimistic versions. Public booking input can no longer set its own price; accepted quote and service prices are converted to server-owned integer cents.
- Added technician skills and availability, capacity-aware half-open scheduling, travel limits, inventory reservations, customer communications, durable offline command replay, signed webhook ingestion, and a retrying transactional outbox. Operational transitions and inventory mutations are restricted to providers/assigned technicians; customer actions are limited to their lifecycle responsibilities. Legacy message filtering was also corrected so a conversation query cannot escape the signed-in participant boundary.
- Added typed, fail-closed maps, calendar, messaging, payment, tax, and accounting HTTP adapters with HTTPS enforcement, timeouts, response validation, stable idempotency headers, durable external-operation records, replay-safe provider events, and failed-webhook redelivery. Missing credentials never return mock success. Actual vendor selection, credentials, vendor-specific translation, sandbox fixtures, settlement reconciliation, and failure-injection certification remain external launch gates.
- Removed executable generated gap pages, mock escrow/scheduling/review/matching/subscription/KYC endpoints, the ungrounded AI center/routes, and demo credential/token disclosure. Authentication now uses verified email, stronger passwords, opaque reset/verification tokens with digests in token tables, and durable email delivery events.
- Replaced destructive startup behavior with an immutable configuration-validating launcher. Demo seeding now requires `ALLOW_DESTRUCTIVE_DEMO_SEED=true`, is rejected in production, and is never coupled to startup or migration. Added a two-step additive Prisma migration path, preserved/backfilled legacy rows, invalidated legacy raw auth tokens, added health endpoints, standalone container/Compose definitions, CI and Dependabot, secrets scanning, environment documentation, operations/provider runbooks, and backup/restore procedures.
- Verification passed: Prisma validation and generation; TypeScript; ESLint with zero errors; the Next.js 16.2.10 production build and its 48/48 page-generation pass; `npm audit` with zero vulnerabilities at the low-severity threshold; 14 automated scenarios (13 non-database plus one database-backed end-to-end journey) covering the requested lifecycle and failure paths. Fresh PostgreSQL migration, production seed refusal, guarded development seed, all 14 tests with the database scenario enabled, legacy-schema upgrade/backfill, and `pg_dump`/`pg_restore` recovery drills passed. Compose configuration and Git-history secret scans passed. CI generates its authentication and internal-worker credentials per run. A local container image build could not be executed because no Docker daemon was running; CI is configured to build the runner image on every change.
- Runtime acceptance passed on 2026-07-20 using isolated PostgreSQL port 55670 and the project-owned Next.js listener on assigned port 6146 (UI reservation 6147). Explicit acknowledgement-gated bcrypt-12 administrator provisioning, credentials login, persisted NextAuth session retrieval, and an authenticated API request all succeeded (`API_VERIFIED`, `startup_login_session_api`). The launcher now requires a free numeric assigned port and binds to loopback; destructive demonstration data is not exposed as a generic runtime seed; session materialization reloads the current verified database user. Follow-up checks passed TypeScript, all 13 portable tests (the database-only scenario was correctly skipped in that pass), ESLint with zero errors, the complete 48-page production build, launcher syntax, manifest parsing, and `git diff --check`.
