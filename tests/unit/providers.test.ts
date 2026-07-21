import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import { createHttpProviders, ProviderError } from '../../src/lib/providers/contracts';

test('external providers fail closed when credentials are absent', async () => {
  const providers = createHttpProviders({});
  await assert.rejects(
    providers.payment.authorize({
      amountCents: 1000,
      currency: 'USD',
      customerReference: 'customer',
      idempotencyKey: 'request-1',
    }),
    (error: unknown) =>
      error instanceof ProviderError && error.code === 'NOT_CONFIGURED' && !error.retryable,
  );
});

test('HTTP provider sends credentials and idempotency key and validates its response', async () => {
  let received: {
    authorization?: string;
    idempotencyKey?: string;
    path?: string;
    body?: unknown;
  } = {};
  const server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => chunks.push(chunk));
    request.on('end', () => {
      received = {
        authorization: request.headers.authorization,
        idempotencyKey: request.headers['idempotency-key'] as string | undefined,
        path: request.url,
        body: JSON.parse(Buffer.concat(chunks).toString('utf8')),
      };
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ id: 'message-provider-reference' }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    const providers = createHttpProviders({
      MESSAGING_PROVIDER: 'test-messaging',
      MESSAGING_API_URL: `http://127.0.0.1:${address.port}`,
      MESSAGING_API_KEY: 'test-provider-key',
    });
    const result = await providers.messaging.send({
      channel: 'EMAIL',
      recipient: 'customer@example.invalid',
      templateKey: 'booking.confirmed',
      variables: { businessName: 'Test Services' },
      idempotencyKey: 'message-idempotency-key',
    });
    assert.equal(result.providerReference, 'message-provider-reference');
    assert.equal(received.authorization, 'Bearer test-provider-key');
    assert.equal(received.idempotencyKey, 'message-idempotency-key');
    assert.equal(received.path, '/messages/send');
    assert.deepEqual(received.body, {
      channel: 'EMAIL',
      recipient: 'customer@example.invalid',
      templateKey: 'booking.confirmed',
      variables: { businessName: 'Test Services' },
      idempotencyKey: 'message-idempotency-key',
    });
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
