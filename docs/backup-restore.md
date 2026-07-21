# Backup and restore

Use provider-managed point-in-time recovery for production and retain encrypted logical backups for migration rollback and audit recovery.

## Backup

```bash
pg_dump \
  --format=custom \
  --no-owner \
  --no-acl \
  --file=local-service-directory.dump \
  "$DATABASE_URL"
```

Record the database engine version, application revision, migration status, timestamp, encrypted object-store checksum, and retention expiry. Do not place dumps in this repository.

## Restore drill

Restore only into an empty disposable database:

```bash
createdb local_service_directory_restore_test
pg_restore \
  --exit-on-error \
  --no-owner \
  --no-acl \
  --dbname=local_service_directory_restore_test \
  local-service-directory.dump
```

Point `DATABASE_URL` at the restored database and run:

```bash
npx prisma migrate status
RUN_DB_TESTS=1 npm test
```

Validate row counts for users, businesses, bookings, work orders, invoices, payments, refunds, webhooks, and outbox events. Reconcile total captured minus refunded cents to invoice balances. Drop the disposable database after recording drill evidence.

## Recovery cautions

- Pause write traffic and outbox processing before a point-in-time restore.
- Rotate provider/webhook/internal-job secrets if a backup may have been exposed.
- Webhook and external-operation idempotency records must be restored with financial rows; otherwise provider replay could duplicate side effects.
- Resume outbox delivery only after payment/accounting reconciliation.

