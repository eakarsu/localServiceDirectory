import { NextRequest, NextResponse } from 'next/server';
import { ingestProviderWebhook } from '@/lib/field-service/webhook-service';
import { domainErrorResponse } from '@/lib/field-service/service';
import { verifyWebhook, WebhookVerificationError } from '@/lib/webhooks';

const providerSecrets = {
  payment: 'PAYMENT_WEBHOOK_SECRET',
  calendar: 'CALENDAR_WEBHOOK_SECRET',
  messaging: 'MESSAGING_WEBHOOK_SECRET',
  tax: 'TAX_WEBHOOK_SECRET',
  accounting: 'ACCOUNTING_WEBHOOK_SECRET',
} as const;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  if (!(provider in providerSecrets)) {
    return NextResponse.json({ error: 'Unknown provider' }, { status: 404 });
  }
  const rawBody = await request.text();
  try {
    const secretName = providerSecrets[provider as keyof typeof providerSecrets];
    const event = verifyWebhook(
      rawBody,
      request.headers.get('x-webhook-signature'),
      request.headers.get('x-webhook-timestamp'),
      process.env[secretName],
    );
    const result = await ingestProviderWebhook(provider, event);
    return NextResponse.json(result, { status: result.duplicate ? 200 : 202 });
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const response = domainErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}

