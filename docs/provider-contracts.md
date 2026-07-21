# Provider contracts

Adapters are defined in `src/lib/providers/contracts.ts`. Each provider is an HTTPS JSON API configured by a base URL and bearer API key. Every mutation receives an `Idempotency-Key` header and must return a stable `id` or `providerReference`.

## Outbound operations

| Capability | Method and path | Required response fields |
| --- | --- | --- |
| Maps geocode | `POST /geocode` | `id`, `latitude`, `longitude` |
| Maps route | `POST /route` | `id`, `distanceMiles`, `durationMinutes` |
| Calendar upsert | `POST /events/upsert` | `id` |
| Calendar cancel | `POST /events/cancel` | `id` |
| Messaging | `POST /messages/send` | `id` |
| Payment authorize | `POST /payments/authorize` | `id`, `status` (`REQUIRES_ACTION` or `AUTHORIZED`) |
| Payment capture | `POST /payments/capture` | `id` |
| Payment refund | `POST /payments/refund` | `id` |
| Tax calculation | `POST /tax/calculate` | `id`, non-negative integer `taxCents` |
| Accounting invoice | `POST /invoices/sync` | `id` |
| Accounting payment | `POST /payments/sync` | `id` |

Money is always integer minor units. Provider errors never include credentials or raw authorization headers in application responses. Missing configuration returns a fail-closed service error; there is no mock-success fallback.

## Inbound event envelope

```json
{
  "id": "evt_stable_provider_id",
  "type": "payment.captured",
  "createdAt": "2026-07-20T12:00:00.000Z",
  "data": {
    "paymentReference": "pay_provider_id",
    "capturedCents": 12500
  }
}
```

Supported state-changing events are `payment.authorized`, `payment.captured`, `payment.failed`, `refund.succeeded`, `message.delivered`, and `calendar.event.updated`. Unknown authenticated events are retained as `IGNORED`, allowing safe forward compatibility.

Before enabling a vendor, implement a thin translation service if its native API differs, run contract tests for timeouts/malformed JSON/429/5xx responses, verify webhook signatures against vendor fixtures, and reconcile captured/refunded cents with vendor settlement reports.

