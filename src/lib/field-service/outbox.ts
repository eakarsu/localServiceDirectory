import { DeliveryStatus, OutboxStatus, Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { createHttpProviders, ProviderError } from '@/lib/providers/contracts';

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function recordOperation(input: {
  provider: string;
  capability: string;
  idempotencyKey: string;
  request: unknown;
  response: unknown;
}) {
  await prisma.externalOperation.upsert({
    where: {
      provider_idempotencyKey: {
        provider: input.provider,
        idempotencyKey: input.idempotencyKey,
      },
    },
    update: {
      response: json(input.response),
      status: 'SUCCEEDED',
      attempts: { increment: 1 },
    },
    create: {
      provider: input.provider,
      capability: input.capability,
      idempotencyKey: input.idempotencyKey,
      request: json(input.request),
      response: json(input.response),
      status: 'SUCCEEDED',
      attempts: 1,
    },
  });
}

async function deliverBookingEffects(
  topic: string,
  aggregateId: string,
  eventId: string,
  payload: Record<string, unknown>,
) {
  const bookingId = typeof payload.bookingId === 'string' ? payload.bookingId : aggregateId;
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { user: true, business: true, service: true },
  });
  if (!booking) return;
  const providers = createHttpProviders();
  if (booking.scheduledStart && booking.scheduledEnd) {
    const idempotencyKey = `${eventId}:calendar`;
    const result = await providers.calendar.upsertEvent({
      externalId: booking.calendarExternalId ?? undefined,
      title: `${booking.service?.name ?? 'Service'} — ${booking.business.name}`,
      startsAt: booking.scheduledStart.toISOString(),
      endsAt: booking.scheduledEnd.toISOString(),
      attendees: [booking.user.email, booking.business.email].filter(
        (email): email is string => Boolean(email),
      ),
      idempotencyKey,
    });
    await prisma.booking.update({
      where: { id: booking.id },
      data: { calendarExternalId: result.providerReference },
    });
    await recordOperation({
      provider: process.env.CALENDAR_PROVIDER ?? 'calendar',
      capability: 'upsert-calendar-event',
      idempotencyKey,
      request: { bookingId: booking.id },
      response: result,
    });
  }
  const messageKey = `${eventId}:customer-message`;
  const communication = await prisma.customerCommunication.upsert({
    where: { idempotencyKey: messageKey },
    update: {},
    create: {
      businessId: booking.businessId,
      recipientUserId: booking.userId,
      bookingId: booking.id,
      channel: 'EMAIL',
      templateKey: topic,
      payload: json({ bookingId: booking.id, businessName: booking.business.name }),
      idempotencyKey: messageKey,
    },
  });
  const result = await providers.messaging.send({
    channel: 'EMAIL',
    recipient: booking.user.email,
    templateKey: topic,
    variables: {
      businessName: booking.business.name,
      startsAt: booking.scheduledStart?.toISOString() ?? '',
    },
    idempotencyKey: messageKey,
  });
  await prisma.customerCommunication.update({
    where: { id: communication.id },
    data: {
      status: DeliveryStatus.SENT,
      providerMessageId: result.providerReference,
      attempts: { increment: 1 },
      sentAt: new Date(),
    },
  });
  await recordOperation({
    provider: process.env.MESSAGING_PROVIDER ?? 'messaging',
    capability: 'send-message',
    idempotencyKey: messageKey,
    request: { templateKey: topic, recipientUserId: booking.userId },
    response: result,
  });
}

async function deliverWorkOrderEffects(topic: string, workOrderId: string, eventId: string) {
  const workOrder = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    include: { booking: { include: { user: true, business: true } } },
  });
  if (!workOrder) return;
  const providers = createHttpProviders();
  if (topic === 'work-order.cancelled' && workOrder.booking.calendarExternalId) {
    const calendarKey = `${eventId}:calendar-cancel`;
    const calendarResult = await providers.calendar.cancelEvent(
      workOrder.booking.calendarExternalId,
      calendarKey,
    );
    await recordOperation({
      provider: process.env.CALENDAR_PROVIDER ?? 'calendar',
      capability: 'cancel-calendar-event',
      idempotencyKey: calendarKey,
      request: { bookingId: workOrder.bookingId },
      response: calendarResult,
    });
  }
  const messageKey = `${eventId}:customer-message`;
  const communication = await prisma.customerCommunication.upsert({
    where: { idempotencyKey: messageKey },
    update: {},
    create: {
      businessId: workOrder.booking.businessId,
      recipientUserId: workOrder.booking.userId,
      bookingId: workOrder.bookingId,
      workOrderId,
      channel: 'EMAIL',
      templateKey: topic,
      payload: json({ workOrderId, status: workOrder.status }),
      idempotencyKey: messageKey,
    },
  });
  const result = await providers.messaging.send({
    channel: 'EMAIL',
    recipient: workOrder.booking.user.email,
    templateKey: topic,
    variables: {
      businessName: workOrder.booking.business.name,
      status: workOrder.status,
    },
    idempotencyKey: messageKey,
  });
  await prisma.customerCommunication.update({
    where: { id: communication.id },
    data: {
      status: DeliveryStatus.SENT,
      providerMessageId: result.providerReference,
      attempts: { increment: 1 },
      sentAt: new Date(),
    },
  });
}

async function deliverInvoiceEffects(invoiceId: string, eventId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      workOrder: { include: { booking: { include: { user: true, business: true } } } },
    },
  });
  if (!invoice) return;
  const providers = createHttpProviders();
  const accountingKey = `${eventId}:accounting`;
  const result = await providers.accounting.syncInvoice({
    invoiceNumber: invoice.number,
    totalCents: invoice.totalCents,
    taxCents: invoice.taxCents,
    currency: invoice.currency,
    status: invoice.status,
    idempotencyKey: accountingKey,
  });
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { accountingRef: result.providerReference },
  });
  await recordOperation({
    provider: process.env.ACCOUNTING_PROVIDER ?? 'accounting',
    capability: 'sync-invoice',
    idempotencyKey: accountingKey,
    request: { invoiceId },
    response: result,
  });
  await deliverWorkOrderEffects('invoice.issued', invoice.workOrderId, eventId);
}

async function deliverPaymentEffects(paymentId: string, eventId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      invoice: {
        include: {
          workOrder: { include: { booking: { include: { user: true, business: true } } } },
        },
      },
    },
  });
  if (!payment) return;
  const providers = createHttpProviders();
  const accountingKey = `${eventId}:accounting`;
  const result = await providers.accounting.syncPayment({
    invoiceNumber: payment.invoice.number,
    amountCents: payment.capturedCents,
    currency: payment.currency,
    paymentReference: payment.providerPaymentId ?? payment.id,
    idempotencyKey: accountingKey,
  });
  await recordOperation({
    provider: process.env.ACCOUNTING_PROVIDER ?? 'accounting',
    capability: 'sync-payment',
    idempotencyKey: accountingKey,
    request: { paymentId },
    response: result,
  });
  await deliverWorkOrderEffects('payment.captured', payment.invoice.workOrderId, eventId);
}

async function deliverAuthEffects(
  topic: string,
  eventId: string,
  payload: Record<string, unknown>,
) {
  const recipient = payload.recipient;
  const url = payload.url;
  if (typeof recipient !== 'string' || typeof url !== 'string') {
    throw new Error('Auth email payload is invalid');
  }
  const providers = createHttpProviders();
  const idempotencyKey = `${eventId}:auth-message`;
  const result = await providers.messaging.send({
    channel: 'EMAIL',
    recipient,
    templateKey: topic,
    variables: {
      name: typeof payload.name === 'string' ? payload.name : '',
      url,
    },
    idempotencyKey,
  });
  await recordOperation({
    provider: process.env.MESSAGING_PROVIDER ?? 'messaging',
    capability: 'send-auth-message',
    idempotencyKey,
    request: { templateKey: topic, recipient },
    response: result,
  });
}

async function deliver(event: {
  id: string;
  topic: string;
  aggregateId: string;
  payload: Prisma.JsonValue;
}) {
  const payload = (event.payload ?? {}) as Record<string, unknown>;
  if (event.topic.startsWith('booking.')) {
    await deliverBookingEffects(event.topic, event.aggregateId, event.id, payload);
  } else if (event.topic.startsWith('work-order.') || event.topic.startsWith('dispatch.')) {
    await deliverWorkOrderEffects(event.topic, event.aggregateId, event.id);
  } else if (event.topic === 'invoice.issued') {
    await deliverInvoiceEffects(event.aggregateId, event.id);
  } else if (event.topic === 'payment.captured') {
    await deliverPaymentEffects(event.aggregateId, event.id);
  } else if (event.topic.startsWith('auth.')) {
    await deliverAuthEffects(event.topic, event.id, payload);
  }
}

export async function processOutboxBatch(limit = 25) {
  const events = await prisma.outboxEvent.findMany({
    where: {
      status: { in: [OutboxStatus.PENDING, OutboxStatus.FAILED] },
      attempts: { lt: 5 },
      availableAt: { lte: new Date() },
    },
    orderBy: { createdAt: 'asc' },
    take: Math.min(Math.max(limit, 1), 100),
  });
  const results: { id: string; status: string }[] = [];
  for (const event of events) {
    const claimed = await prisma.outboxEvent.updateMany({
      where: {
        id: event.id,
        status: { in: [OutboxStatus.PENDING, OutboxStatus.FAILED] },
      },
      data: { status: OutboxStatus.PROCESSING, attempts: { increment: 1 } },
    });
    if (claimed.count !== 1) continue;
    try {
      await deliver(event);
      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: { status: OutboxStatus.SENT, processedAt: new Date(), lastError: null },
      });
      results.push({ id: event.id, status: 'SENT' });
    } catch (error) {
      const retryable = !(error instanceof ProviderError) || error.retryable;
      const attempts = event.attempts + 1;
      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: OutboxStatus.FAILED,
          availableAt: new Date(Date.now() + Math.min(60_000 * 2 ** attempts, 60 * 60_000)),
          lastError: error instanceof Error ? error.message.slice(0, 1000) : 'Delivery failed',
          ...(retryable ? {} : { attempts: 5 }),
        },
      });
      results.push({ id: event.id, status: 'FAILED' });
    }
  }
  return results;
}
