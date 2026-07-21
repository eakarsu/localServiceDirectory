import assert from 'node:assert/strict';
import test from 'node:test';
import {
  InvoiceStatus,
  PaymentStatus,
  QuoteStatus,
  WebhookStatus,
  WorkOrderStatus,
} from '@prisma/client';
import prisma from '../../src/lib/prisma';
import { DomainError } from '../../src/lib/field-service/policy';
import {
  assignTechnician,
  createBookingWorkflow,
  recordOfflineCommand,
  reserveInventory,
  rescheduleWorkOrder,
  transitionWorkOrder,
} from '../../src/lib/field-service/service';
import { ingestProviderWebhook } from '../../src/lib/field-service/webhook-service';

const runDatabaseTests = process.env.RUN_DB_TESTS === '1';

test(
  'database-backed end-to-end workflow persists lifecycle, permissions, webhooks, and recovery',
  { skip: !runDatabaseTests },
  async () => {
    const ownerId = 'integration-owner';
    const consumerId = 'integration-consumer';
    await prisma.user.deleteMany({ where: { id: { in: [ownerId, consumerId] } } });
    const owner = await prisma.user.create({
      data: {
        id: ownerId,
        email: 'integration-owner@example.invalid',
        password: 'not-used-in-integration-tests',
        name: 'Integration Owner',
        role: 'BUSINESS_OWNER',
        emailVerified: new Date(),
      },
    });
    const consumer = await prisma.user.create({
      data: {
        id: consumerId,
        email: 'integration-consumer@example.invalid',
        password: 'not-used-in-integration-tests',
        name: 'Integration Consumer',
        emailVerified: new Date(),
      },
    });
    const business = await prisma.business.create({
      data: { ownerId: owner.id, name: 'Integration Services', slug: 'integration-services' },
    });
    const category = await prisma.category.upsert({
      where: { slug: 'integration-category' },
      update: {},
      create: { name: 'Integration Category', slug: 'integration-category' },
    });
    const skill = await prisma.skill.upsert({
      where: { name: 'Integration Skill' },
      update: {},
      create: { name: 'Integration Skill' },
    });
    const service = await prisma.service.create({
      data: {
        businessId: business.id,
        categoryId: category.id,
        name: 'Integration Service',
        price: 125,
        duration: 60,
        requiredSkills: { connect: { id: skill.id } },
      },
    });
    const firstTechnician = await prisma.technician.create({
      data: {
        businessId: business.id,
        name: 'First Technician',
        skills: { connect: { id: skill.id } },
      },
    });
    const secondTechnician = await prisma.technician.create({
      data: {
        businessId: business.id,
        name: 'Second Technician',
        skills: { connect: { id: skill.id } },
      },
    });
    const dayOneStart = new Date('2026-08-01T09:00:00.000Z');
    const dayOneEnd = new Date('2026-08-01T10:00:00.000Z');
    const dayTwoStart = new Date('2026-08-02T09:00:00.000Z');
    const dayTwoEnd = new Date('2026-08-02T10:00:00.000Z');
    const dayThreeStart = new Date('2026-08-03T09:00:00.000Z');
    const dayThreeEnd = new Date('2026-08-03T10:00:00.000Z');
    await prisma.availabilityWindow.createMany({
      data: [
        { businessId: business.id, startsAt: dayOneStart, endsAt: dayOneEnd },
        { businessId: business.id, startsAt: dayTwoStart, endsAt: dayTwoEnd },
        { businessId: business.id, startsAt: dayThreeStart, endsAt: dayThreeEnd },
        {
          businessId: business.id,
          technicianId: firstTechnician.id,
          startsAt: dayOneStart,
          endsAt: dayOneEnd,
        },
        {
          businessId: business.id,
          technicianId: secondTechnician.id,
          startsAt: dayOneStart,
          endsAt: dayOneEnd,
        },
        {
          businessId: business.id,
          technicianId: secondTechnician.id,
          startsAt: dayTwoStart,
          endsAt: dayTwoEnd,
        },
      ],
    });
    const actor = { id: consumer.id, role: 'CONSUMER' };
    const booking = await createBookingWorkflow(actor, {
      businessId: business.id,
      serviceId: service.id,
      scheduledStart: dayOneStart,
      scheduledEnd: dayOneEnd,
      idempotencyKey: 'integration-booking-one',
    });
    await assert.rejects(
      transitionWorkOrder(actor, booking.workOrder!.id, WorkOrderStatus.ASSIGNED, 1),
      (error: unknown) => error instanceof DomainError && error.code === 'FORBIDDEN',
    );
    const inventoryItem = await prisma.inventoryItem.create({
      data: {
        businessId: business.id,
        sku: 'integration-part',
        name: 'Integration Part',
        onHandQuantity: 5,
      },
    });
    await assert.rejects(
      reserveInventory(actor, booking.workOrder!.id, inventoryItem.id, 1, 1),
      (error: unknown) => error instanceof DomainError && error.code === 'FORBIDDEN',
    );
    await assert.rejects(
      createBookingWorkflow(actor, {
        businessId: business.id,
        serviceId: service.id,
        scheduledStart: new Date('2026-08-01T09:15:00.000Z'),
        scheduledEnd: new Date('2026-08-01T09:45:00.000Z'),
        idempotencyKey: 'integration-booking-overlap',
      }),
      (error: unknown) => error instanceof DomainError && error.code === 'OVERBOOKED',
    );
    const workOrderId = booking.workOrder!.id;
    const providerActor = { id: owner.id, role: 'BUSINESS_OWNER', businessId: business.id };
    await assignTechnician(providerActor, workOrderId, firstTechnician.id, 1);
    const reassigned = await assignTechnician(providerActor, workOrderId, secondTechnician.id, 2);
    assert.equal(reassigned.technicianId, secondTechnician.id);
    await transitionWorkOrder(providerActor, workOrderId, WorkOrderStatus.DISPATCHED, 3);
    await transitionWorkOrder(providerActor, workOrderId, WorkOrderStatus.EN_ROUTE, 4);
    await transitionWorkOrder(providerActor, workOrderId, WorkOrderStatus.NO_SHOW, 5);
    const rescheduled = await rescheduleWorkOrder(
      actor,
      workOrderId,
      6,
      dayTwoStart,
      dayTwoEnd,
      'Customer requested another day',
    );
    assert.equal(rescheduled.booking.scheduledStart?.toISOString(), dayTwoStart.toISOString());
    const offline = await recordOfflineCommand(providerActor, {
      deviceId: 'integration-device',
      clientCommandId: 'integration-command',
      workOrderId,
      expectedVersion: 7,
      command: 'TRANSITION',
      payload: { toStatus: WorkOrderStatus.DISPATCHED },
    });
    assert.equal(offline.status, 'APPLIED');
    const replay = await recordOfflineCommand(providerActor, {
      deviceId: 'integration-device',
      clientCommandId: 'integration-command',
      workOrderId,
      expectedVersion: 7,
      command: 'TRANSITION',
      payload: { toStatus: WorkOrderStatus.DISPATCHED },
    });
    assert.equal(replay.id, offline.id);

    await assert.rejects(
      rescheduleWorkOrder(
        actor,
        workOrderId,
        8,
        dayThreeStart,
        dayThreeEnd,
        'Assigned technician is unavailable',
      ),
      (error: unknown) => error instanceof DomainError && error.code === 'OUTSIDE_AVAILABILITY',
    );

    const quoteRequest = await prisma.quoteRequest.create({
      data: {
        businessId: business.id,
        userId: consumer.id,
        serviceDescription: 'Quoted integration service',
        status: QuoteStatus.ACCEPTED,
        idempotencyKey: 'integration-quote-request',
        quote: {
          create: {
            price: 42.42,
            amountCents: 4242,
            description: 'Accepted fixed-price quote',
            validUntil: new Date('2026-09-01T00:00:00.000Z'),
            acceptedAt: new Date(),
          },
        },
      },
    });
    const quoteBooking = await createBookingWorkflow(actor, {
      businessId: business.id,
      quoteRequestId: quoteRequest.id,
      scheduledStart: dayThreeStart,
      scheduledEnd: dayThreeEnd,
      idempotencyKey: 'integration-quote-booking',
    });
    assert.equal(quoteBooking.amountCents, 4242);
    assert.equal(quoteBooking.quoteRequestId, quoteRequest.id);
    await assert.rejects(
      createBookingWorkflow(actor, {
        businessId: business.id,
        quoteRequestId: quoteRequest.id,
        scheduledStart: dayThreeStart,
        scheduledEnd: dayThreeEnd,
        idempotencyKey: 'integration-quote-booking-second',
      }),
      (error: unknown) =>
        error instanceof DomainError && error.code === 'ACCEPTED_QUOTE_REQUIRED',
    );

    const invoice = await prisma.invoice.create({
      data: {
        workOrderId,
        number: 'INV-INTEGRATION-ONE',
        status: InvoiceStatus.OPEN,
        lineItems: [{ description: 'Integration service', amountCents: 1000 }],
        subtotalCents: 1000,
        totalCents: 1000,
        balanceCents: 1000,
      },
    });
    const payment = await prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        provider: 'payment',
        providerPaymentId: 'integration-payment-reference',
        idempotencyKey: 'integration-payment-authorization',
        status: PaymentStatus.AUTHORIZED,
        amountCents: 1000,
      },
    });
    const captureEvent = {
      id: 'integration-webhook-capture',
      type: 'payment.captured',
      data: { paymentReference: 'integration-payment-reference', capturedCents: 1000 },
    };
    const processed = await ingestProviderWebhook('payment', captureEvent);
    assert.equal(processed.duplicate, false);
    const duplicate = await ingestProviderWebhook('payment', captureEvent);
    assert.equal(duplicate.duplicate, true);
    const captured = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    assert.equal(captured.status, PaymentStatus.CAPTURED);
    assert.equal(captured.capturedCents, 1000);
    assert.equal(
      await prisma.outboxEvent.count({
        where: { idempotencyKey: `payment.captured:${payment.id}:${captureEvent.id}` },
      }),
      1,
    );

    const retryInvoice = await prisma.invoice.create({
      data: {
        workOrderId: quoteBooking.workOrder!.id,
        number: 'INV-INTEGRATION-TWO',
        status: InvoiceStatus.OPEN,
        lineItems: [{ description: 'Quoted integration service', amountCents: 4242 }],
        subtotalCents: 4242,
        totalCents: 4242,
        balanceCents: 4242,
      },
    });
    const retryEvent = {
      id: 'integration-webhook-retry',
      type: 'payment.captured',
      data: { paymentReference: 'integration-late-payment', capturedCents: 500 },
    };
    await assert.rejects(
      ingestProviderWebhook('payment', retryEvent),
      (error: unknown) => error instanceof DomainError && error.code === 'PAYMENT_NOT_FOUND',
    );
    const latePayment = await prisma.payment.create({
      data: {
        invoiceId: retryInvoice.id,
        provider: 'payment',
        providerPaymentId: 'integration-late-payment',
        idempotencyKey: 'integration-late-payment-authorization',
        status: PaymentStatus.AUTHORIZED,
        amountCents: 500,
      },
    });
    const retried = await ingestProviderWebhook('payment', retryEvent);
    assert.equal(retried.duplicate, false);
    const storedRetry = await prisma.webhookEvent.findUniqueOrThrow({
      where: {
        provider_externalEventId: {
          provider: 'payment',
          externalEventId: retryEvent.id,
        },
      },
    });
    assert.equal(storedRetry.status, WebhookStatus.PROCESSED);
    assert.equal(storedRetry.attempts, 2);

    await prisma.dispatchAssignment.deleteMany({ where: { workOrderId } });
    await prisma.webhookEvent.deleteMany({
      where: { externalEventId: { in: [captureEvent.id, retryEvent.id] } },
    });
    await prisma.user.deleteMany({ where: { id: { in: [ownerId, consumerId] } } });
    await prisma.outboxEvent.deleteMany({
      where: {
        OR: [
          { aggregateId: booking.id },
          { aggregateId: quoteBooking.id },
          { aggregateId: workOrderId },
          { aggregateId: quoteBooking.workOrder!.id },
          { aggregateId: payment.id },
          { aggregateId: latePayment.id },
          { idempotencyKey: { contains: booking.id } },
          { idempotencyKey: { contains: quoteBooking.id } },
          { idempotencyKey: { contains: workOrderId } },
          { idempotencyKey: { contains: quoteBooking.workOrder!.id } },
        ],
      },
    });
  },
);
