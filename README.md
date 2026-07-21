# Local Service Directory

A Next.js and PostgreSQL marketplace with a durable field-service workflow. The operational path covers quote decisions, capacity-aware booking, technician dispatch, job status, change orders, inventory, invoicing, payments/refunds, customer communications, and offline command recovery.

## Requirements

- Node.js 22+
- PostgreSQL 14+
- npm 11+

## Local setup

```bash
cp .env.example .env
npm ci
npm run db:generate
npm run db:migrate:deploy
npm run dev
```

Migrations never seed or reset data. Demo seeding is a destructive development-only action and refuses to run unless explicitly enabled against a disposable database:

```bash
ALLOW_DESTRUCTIVE_DEMO_SEED=true npm run db:seed
```

It is always rejected when `NODE_ENV=production`. The checked-in `start.sh` only validates configuration and starts an already-built app; it does not install packages, kill processes, rewrite `.env`, migrate, reset, or seed the database.

Business owners must publish business and technician availability through `POST /api/operations/resources` before customers can book. This is deliberate: booking fails closed instead of silently overbooking an unpublished schedule. After accepting a quote, the customer supplies its `quoteRequestId` to `POST /api/bookings`; the server binds the accepted quote price to the booking and rejects reuse of that quote.

## Verification

```bash
npm run db:validate
npm run lint
npm run typecheck
npm test
npm run build
npm audit
```

Database-backed tests are opt-in locally and mandatory in CI:

```bash
RUN_DB_TESTS=1 DATABASE_URL='postgresql://…' npm test
```

CI provisions PostgreSQL, deploys both migrations, runs unit and database integration scenarios, builds the app and container, audits dependencies, and scans Git history for secrets.

## Production deployment

1. Back up the database and restore it into a staging environment.
2. Run `npm run db:migrate:deploy` as a one-shot deployment job.
3. Configure provider credentials and signed webhook secrets from `.env.example` in a secret manager.
4. Start the immutable build with `npm run start`, `./start.sh`, or the container image.
5. Schedule `POST /api/internal/outbox` with `Authorization: Bearer $INTERNAL_JOB_SECRET` at least once per minute.
6. Monitor `/api/health/live`, `/api/health/ready`, failed outbox events, failed webhooks, and provider error rates.

For a database originally created with `prisma db push`, follow the baseline procedure in [operations.md](docs/operations.md) before deploying the field-service migration.

## Main APIs

- `POST /api/quotes`, `POST /api/quotes/:id/respond`, `POST /api/quotes/:id/decision`
- `POST /api/bookings` with an `Idempotency-Key` header
- `GET /api/work-orders/:id`, `POST /api/work-orders/:id/commands`
- `GET|POST /api/operations/resources`
- `POST /api/invoices/:id/payments`
- `POST /api/payments/:id/capture`, `POST /api/payments/:id/refunds`
- `POST /api/webhooks/:provider`
- `POST /api/internal/outbox`

See [operations.md](docs/operations.md) for lifecycle and incident procedures, [provider-contracts.md](docs/provider-contracts.md) for adapter/webhook contracts, and [backup-restore.md](docs/backup-restore.md) for recovery drills.

## External launch gate

The repository includes fail-closed provider adapters and idempotent webhook/outbox handling, but it does not contain third-party credentials. Before launch, select the actual maps, calendar, messaging, payment, tax, and accounting vendors; validate their request/response mappings in vendor sandboxes; rotate webhook secrets; and complete reconciliation and failure-injection tests. No route reports mock provider success when a provider is absent.
