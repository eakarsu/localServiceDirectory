import { InvoiceStatus, PaymentStatus, Prisma, WebhookStatus } from '@prisma/client';
import prisma from '@/lib/prisma';
import { DomainError } from './policy';
import { ProviderWebhook } from '@/lib/webhooks';

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function stringData(data: Record<string, unknown>, key: string): string {
  const value = data[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new DomainError('INVALID_WEBHOOK', `${key} is required`, 400);
  }
  return value;
}

function centsData(data: Record<string, unknown>, key: string): number {
  const value = data[key];
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new DomainError('INVALID_WEBHOOK', `${key} must be non-negative integer cents`, 400);
  }
  return value as number;
}

async function updateInvoiceFromPayment(
  tx: Prisma.TransactionClient,
  invoiceId: string,
): Promise<void> {
  const invoice = await tx.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { payments: true },
  });
  const paidCents = invoice.payments.reduce(
    (sum, payment) => sum + payment.capturedCents - payment.refundedCents,
    0,
  );
  const balanceCents = Math.max(0, invoice.totalCents - paidCents);
  let status: InvoiceStatus = InvoiceStatus.OPEN;
  if (balanceCents === 0) status = InvoiceStatus.PAID;
  else if (paidCents > 0) status = InvoiceStatus.PARTIALLY_PAID;
  if (
    invoice.payments.some((payment) => payment.capturedCents > 0) &&
    invoice.payments.every((payment) => payment.capturedCents === payment.refundedCents)
  ) {
    status = InvoiceStatus.REFUNDED;
  }
  await tx.invoice.update({ where: { id: invoiceId }, data: { balanceCents, status } });
}

export async function ingestProviderWebhook(provider: string, event: ProviderWebhook) {
  try {
    await prisma.webhookEvent.create({
      data: {
        provider,
        externalEventId: event.id,
        eventType: event.type,
        payload: json(event),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const retry = await prisma.webhookEvent.updateMany({
        where: {
          provider,
          externalEventId: event.id,
          status: WebhookStatus.FAILED,
          attempts: { lt: 5 },
        },
        data: { status: WebhookStatus.RECEIVED, error: null },
      });
      if (retry.count !== 1) return { duplicate: true, eventId: event.id };
    } else {
      throw error;
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      if (provider === 'payment') {
        const paymentReference = stringData(event.data, 'paymentReference');
        const payment = await tx.payment.findUnique({
          where: { providerPaymentId: paymentReference },
        });
        if (!payment) throw new DomainError('PAYMENT_NOT_FOUND', 'Payment reference not found', 404);
        switch (event.type) {
          case 'payment.authorized':
            await tx.payment.update({
              where: { id: payment.id },
              data: { status: PaymentStatus.AUTHORIZED },
            });
            break;
          case 'payment.captured': {
            const capturedCents = centsData(event.data, 'capturedCents');
            if (capturedCents > payment.amountCents) {
              throw new DomainError('INVALID_WEBHOOK', 'Capture exceeds authorized amount', 400);
            }
            await tx.payment.update({
              where: { id: payment.id },
              data: { status: PaymentStatus.CAPTURED, capturedCents },
            });
            await updateInvoiceFromPayment(tx, payment.invoiceId);
            await tx.outboxEvent.upsert({
              where: { idempotencyKey: `payment.captured:${payment.id}:${event.id}` },
              update: {},
              create: {
                topic: 'payment.captured',
                aggregateId: payment.id,
                idempotencyKey: `payment.captured:${payment.id}:${event.id}`,
                payload: json({ paymentId: payment.id, invoiceId: payment.invoiceId }),
              },
            });
            break;
          }
          case 'payment.failed':
            await tx.payment.update({
              where: { id: payment.id },
              data: {
                status: PaymentStatus.FAILED,
                failureCode:
                  typeof event.data.failureCode === 'string'
                    ? event.data.failureCode.slice(0, 200)
                    : 'provider_failed',
              },
            });
            break;
          case 'refund.succeeded': {
            const refundReference = stringData(event.data, 'refundReference');
            const refundedCents = centsData(event.data, 'amountCents');
            const refund = await tx.refund.findUnique({
              where: { providerRefundId: refundReference },
            });
            if (!refund || refund.paymentId !== payment.id || refund.amountCents !== refundedCents) {
              throw new DomainError('REFUND_NOT_FOUND', 'Refund reference or amount does not match', 404);
            }
            const newRefundedTotal = payment.refundedCents + refundedCents;
            if (newRefundedTotal > payment.capturedCents) {
              throw new DomainError('INVALID_WEBHOOK', 'Refund exceeds captured amount', 400);
            }
            await tx.refund.update({
              where: { id: refund.id },
              data: { status: PaymentStatus.REFUNDED },
            });
            await tx.payment.update({
              where: { id: payment.id },
              data: {
                refundedCents: newRefundedTotal,
                status:
                  newRefundedTotal === payment.capturedCents
                    ? PaymentStatus.REFUNDED
                    : PaymentStatus.PARTIALLY_REFUNDED,
              },
            });
            await updateInvoiceFromPayment(tx, payment.invoiceId);
            break;
          }
          default:
            return { ignored: true };
        }
      } else if (provider === 'messaging' && event.type === 'message.delivered') {
        const messageReference = stringData(event.data, 'messageReference');
        await tx.customerCommunication.updateMany({
          where: { providerMessageId: messageReference },
          data: { status: 'DELIVERED' },
        });
      } else if (provider === 'calendar' && event.type === 'calendar.event.updated') {
        const bookingId = stringData(event.data, 'bookingId');
        const externalId = stringData(event.data, 'eventReference');
        await tx.booking.update({ where: { id: bookingId }, data: { calendarExternalId: externalId } });
      } else {
        return { ignored: true };
      }
      return { ignored: false };
    });

    await prisma.webhookEvent.update({
      where: { provider_externalEventId: { provider, externalEventId: event.id } },
      data: {
        status: result.ignored ? WebhookStatus.IGNORED : WebhookStatus.PROCESSED,
        attempts: { increment: 1 },
        processedAt: new Date(),
      },
    });
    return { duplicate: false, eventId: event.id, ...result };
  } catch (error) {
    await prisma.webhookEvent.update({
      where: { provider_externalEventId: { provider, externalEventId: event.id } },
      data: {
        status: WebhookStatus.FAILED,
        attempts: { increment: 1 },
        error: error instanceof Error ? error.message.slice(0, 1000) : 'Webhook processing failed',
      },
    });
    throw error;
  }
}
