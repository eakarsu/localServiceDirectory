import assert from 'node:assert/strict';
import test from 'node:test';
import { signWebhook, verifyWebhook, WebhookVerificationError } from '../../src/lib/webhooks';

const body = JSON.stringify({
  id: 'evt_123',
  type: 'payment.captured',
  data: { paymentReference: 'pay_123', capturedCents: 1000 },
});
const secret = 'test-webhook-secret-at-least-32-bytes';
const timestamp = '1785571200';
const now = Number(timestamp) * 1000;

test('signed webhook is accepted inside the replay window', () => {
  const signature = `v1=${signWebhook(body, timestamp, secret)}`;
  assert.equal(verifyWebhook(body, signature, timestamp, secret, now).id, 'evt_123');
});

test('tampering and stale webhook replays are rejected', () => {
  const signature = `v1=${signWebhook(body, timestamp, secret)}`;
  assert.throws(
    () => verifyWebhook(`${body} `, signature, timestamp, secret, now),
    WebhookVerificationError,
  );
  assert.throws(
    () => verifyWebhook(body, signature, timestamp, secret, now + 6 * 60 * 1000),
    WebhookVerificationError,
  );
});

