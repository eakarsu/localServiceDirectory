# Operations runbook

## Lifecycle ownership

- Customers request and decide quotes, request/reschedule bookings, approve or reject change orders, authorize payments, and cancel eligible bookings.
- Business owners confirm bookings, configure resources, assign/reassign technicians, issue change orders and invoices, capture payments, and issue refunds.
- Assigned technicians can advance job status. Every work-order mutation uses an expected version and writes a `JobEvent`.
- Administrators may investigate and recover workflows, but all mutations still pass the same transition rules.

Allowed work-order progression is:

`SCHEDULED → ASSIGNED → DISPATCHED → EN_ROUTE → IN_PROGRESS → PARTIALLY_COMPLETED|PAUSED → COMPLETED`

No-show, cancellation, rescheduling, and reassignment are explicit branches. Invalid transitions return `409 INVALID_TRANSITION`. Physical booking deletion is disabled so invoices, refunds, communications, and audit events remain attributable.

## Booking and dispatch invariants

- API clients send an `Idempotency-Key` for booking and financial commands.
- A business availability window must fully contain the requested slot.
- Capacity is checked in a serializable transaction with half-open time ranges.
- Technician assignment checks active status, required skills, technician availability, overlapping dispatches, and travel limits.
- Inventory reservation uses both database constraints and optimistic item versions.
- Offline commands are unique per device/client command ID and require the current aggregate version. Duplicate replay returns the original result; stale replay records a conflict.

## Outbox operation

Database state and `OutboxEvent` creation are committed together. A scheduler calls:

```bash
curl --fail --request POST \
  --header "Authorization: Bearer $INTERNAL_JOB_SECRET" \
  "https://service.example/api/internal/outbox?limit=50"
```

Provider calls use their outbox event as an idempotency key. Retryable failures use exponential backoff and stop after five attempts. Alert on `OutboxEvent.status = FAILED`, inspect `lastError`, fix configuration/provider availability, and reset only the affected event to `PENDING` after confirming the provider did not already apply it.

## Webhook operation

Only the provider names `payment`, `calendar`, `messaging`, `tax`, and `accounting` are accepted. Requests require:

- `x-webhook-timestamp`: Unix seconds no more than five minutes old
- `x-webhook-signature`: `v1=` plus HMAC-SHA256 of `<timestamp>.<raw body>`
- A stable provider event ID in the JSON body

`WebhookEvent(provider, externalEventId)` is unique. Successful replays return success without applying the event twice. A provider redelivery may retry a failed event up to five total attempts; each failure retains a bounded error for investigation.

## Migration paths

New database:

```bash
npm run db:migrate:deploy
```

Existing database created by the old `prisma db push` workflow:

1. Take and verify a backup.
2. Restore it into staging and confirm it matches the baseline schema.
3. Mark only the baseline migration as already applied:

   ```bash
   npx prisma migrate resolve --applied 20260720090000_baseline
   ```

4. Run `npm run db:migrate:deploy`. The field-service migration preserves rows, backfills schedules/money/work orders, and invalidates legacy raw reset/verification tokens.
5. Run smoke and reconciliation checks before repeating in production.

Never mark the field-service migration applied without running it. Never use `db push --force-reset` against shared or production data.

## Monitoring

Alert on:

- readiness failures or database connection saturation;
- repeated `OVERBOOKED`, inventory conflict, or version conflict errors;
- failed outbox/webhook events and attempts approaching five;
- payments whose provider state does not reconcile to local captured/refunded cents;
- invoices without an accounting reference after outbox delivery;
- authentication email delivery failures and unusual reset volume.
