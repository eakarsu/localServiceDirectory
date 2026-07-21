import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

export class WebhookVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebhookVerificationError';
  }
}

export const providerWebhookSchema = z.object({
  id: z.string().min(1).max(200),
  type: z.string().min(1).max(200),
  createdAt: z.string().datetime().optional(),
  data: z.record(z.string(), z.unknown()),
});

export type ProviderWebhook = z.infer<typeof providerWebhookSchema>;

export function signWebhook(rawBody: string, timestamp: string, secret: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
}

export function verifyWebhook(
  rawBody: string,
  signatureHeader: string | null,
  timestampHeader: string | null,
  secret: string | undefined,
  now = Date.now(),
): ProviderWebhook {
  if (!secret) throw new WebhookVerificationError('Webhook secret is not configured');
  if (!signatureHeader || !timestampHeader) {
    throw new WebhookVerificationError('Webhook signature is missing');
  }
  const timestamp = Number(timestampHeader);
  if (!Number.isFinite(timestamp) || Math.abs(now - timestamp * 1000) > 5 * 60 * 1000) {
    throw new WebhookVerificationError('Webhook timestamp is outside the replay window');
  }
  const supplied = signatureHeader.startsWith('v1=') ? signatureHeader.slice(3) : signatureHeader;
  const expected = signWebhook(rawBody, timestampHeader, secret);
  const suppliedBuffer = Buffer.from(supplied, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  if (
    suppliedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(suppliedBuffer, expectedBuffer)
  ) {
    throw new WebhookVerificationError('Webhook signature is invalid');
  }
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    throw new WebhookVerificationError('Webhook body is invalid JSON');
  }
  const parsed = providerWebhookSchema.safeParse(payload);
  if (!parsed.success) throw new WebhookVerificationError('Webhook payload is invalid');
  return parsed.data;
}

