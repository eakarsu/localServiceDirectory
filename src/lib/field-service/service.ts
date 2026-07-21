import {
  BookingStatus,
  ChangeOrderStatus,
  DispatchStatus,
  InvoiceStatus,
  OfflineCommandStatus,
  OutboxStatus,
  PaymentStatus,
  Prisma,
  WorkOrderStatus,
} from '@prisma/client';
import prisma from '@/lib/prisma';
import {
  assertChangeOrderTransition,
  assertExpectedVersion,
  assertInsideAvailability,
  assertNoOverbooking,
  assertRefundAllowed,
  assertRequiredSkills,
  assertWithinTravelLimit,
  assertWorkOrderTransition,
  DomainError,
  WorkOrderState,
} from './policy';
import { createHttpProviders, ProviderError } from '@/lib/providers/contracts';

const ACTIVE_DISPATCH_STATUSES: DispatchStatus[] = [
  DispatchStatus.ASSIGNED,
  DispatchStatus.ACKNOWLEDGED,
];

export interface Actor {
  id: string;
  role: string;
  businessId?: string;
}

export interface CreateBookingInput {
  businessId: string;
  serviceId?: string;
  quoteRequestId?: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  notes?: string;
  amountCents?: number;
  idempotencyKey: string;
  serviceAddress?: string;
  serviceCity?: string;
  serviceState?: string;
  serviceZipCode?: string;
  serviceLatitude?: number;
  serviceLongitude?: number;
}

function legacyDateFields(startsAt: Date, endsAt: Date): {
  date: Date;
  startTime: string;
  endTime: string;
} {
  return {
    date: new Date(Date.UTC(startsAt.getUTCFullYear(), startsAt.getUTCMonth(), startsAt.getUTCDate())),
    startTime: startsAt.toISOString().slice(11, 16),
    endTime: endsAt.toISOString().slice(11, 16),
  };
}

function serialize(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function workOrderAccess(
  actor: Actor,
  workOrder: {
    booking: { userId: string; businessId: string; business: { ownerId: string } };
    dispatches: { technician: { userId: string | null } }[];
  },
): boolean {
  return (
    actor.role === 'ADMIN' ||
    actor.id === workOrder.booking.userId ||
    actor.id === workOrder.booking.business.ownerId ||
    actor.businessId === workOrder.booking.businessId ||
    workOrder.dispatches.some((dispatch) => dispatch.technician.userId === actor.id)
  );
}

function assertWorkOrderAccess(actor: Actor, workOrder: Parameters<typeof workOrderAccess>[1]): void {
  if (!workOrderAccess(actor, workOrder)) {
    throw new DomainError('FORBIDDEN', 'You cannot access this work order', 403);
  }
}

export async function createBookingWorkflow(actor: Actor, input: CreateBookingInput) {
  if (input.scheduledStart >= input.scheduledEnd) {
    throw new DomainError('INVALID_TIME_RANGE', 'Start must be before end', 400);
  }
  if (!input.idempotencyKey || input.idempotencyKey.length > 200) {
    throw new DomainError('IDEMPOTENCY_KEY_REQUIRED', 'A valid Idempotency-Key is required', 400);
  }

  const existing = await prisma.booking.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
    include: { workOrder: true, business: true, service: true },
  });
  if (existing) {
    if (existing.userId !== actor.id) {
      throw new DomainError('IDEMPOTENCY_CONFLICT', 'Idempotency key belongs to another request');
    }
    return existing;
  }

  return prisma.$transaction(
    async (tx) => {
      const business = await tx.business.findFirst({
        where: { id: input.businessId, active: true },
        include: { serviceAreas: true },
      });
      if (!business) throw new DomainError('BUSINESS_NOT_FOUND', 'Business not found', 404);

      const service = input.serviceId
        ? await tx.service.findFirst({
            where: { id: input.serviceId, businessId: input.businessId, active: true },
          })
        : null;
      if (input.serviceId && !service) {
        throw new DomainError('SERVICE_NOT_FOUND', 'Service does not belong to this business', 404);
      }

      const acceptedQuote = input.quoteRequestId
        ? await tx.quoteRequest.findFirst({
            where: {
              id: input.quoteRequestId,
              userId: actor.id,
              businessId: input.businessId,
              status: 'ACCEPTED',
              booking: null,
            },
            include: { quote: true },
          })
        : null;
      if (input.quoteRequestId && (!acceptedQuote || !acceptedQuote.quote)) {
        throw new DomainError(
          'ACCEPTED_QUOTE_REQUIRED',
          'The quote must be accepted, belong to this customer, and not already be booked',
          409,
        );
      }

      if (
        input.serviceLatitude !== undefined &&
        input.serviceLongitude !== undefined &&
        business.latitude !== null &&
        business.longitude !== null &&
        business.serviceRadius !== null
      ) {
        assertWithinTravelLimit(
          { latitude: business.latitude, longitude: business.longitude },
          { latitude: input.serviceLatitude, longitude: input.serviceLongitude },
          business.serviceRadius,
        );
      } else if (input.serviceZipCode && business.serviceAreas.length > 0) {
        const allowed = business.serviceAreas.some(
          (area) =>
            area.zipCode === input.serviceZipCode ||
            (area.city.toLowerCase() === input.serviceCity?.toLowerCase() &&
              area.state.toLowerCase() === input.serviceState?.toLowerCase()),
        );
        if (!allowed) {
          throw new DomainError('OUTSIDE_SERVICE_AREA', 'Address is outside the provider service area');
        }
      }

      const windows = await tx.availabilityWindow.findMany({
        where: {
          businessId: input.businessId,
          technicianId: null,
          available: true,
          startsAt: { lte: input.scheduledStart },
          endsAt: { gte: input.scheduledEnd },
        },
      });
      const window = assertInsideAvailability(
        { startsAt: input.scheduledStart, endsAt: input.scheduledEnd },
        windows,
      );
      const concurrent = await tx.booking.findMany({
        where: {
          businessId: input.businessId,
          status: { not: BookingStatus.CANCELLED },
          scheduledStart: { lt: input.scheduledEnd },
          scheduledEnd: { gt: input.scheduledStart },
        },
        select: { scheduledStart: true, scheduledEnd: true },
      });
      assertNoOverbooking(
        { startsAt: input.scheduledStart, endsAt: input.scheduledEnd },
        concurrent
          .filter(
            (booking): booking is { scheduledStart: Date; scheduledEnd: Date } =>
              booking.scheduledStart !== null && booking.scheduledEnd !== null,
          )
          .map((booking) => ({
            startsAt: booking.scheduledStart,
            endsAt: booking.scheduledEnd,
          })),
        window.capacity,
      );

      const quoteAmountCents = acceptedQuote?.quote
        ? acceptedQuote.quote.amountCents ?? Math.round(acceptedQuote.quote.price * 100)
        : undefined;
      const amountCents = quoteAmountCents ?? input.amountCents ??
        (service?.price !== null && service?.price !== undefined
          ? Math.round(service.price * 100)
          : undefined);
      if (amountCents !== undefined && (!Number.isSafeInteger(amountCents) || amountCents < 0)) {
        throw new DomainError('INVALID_MONEY', 'Amount must use non-negative integer cents', 400);
      }
      const legacy = legacyDateFields(input.scheduledStart, input.scheduledEnd);
      const booking = await tx.booking.create({
        data: {
          businessId: input.businessId,
          userId: actor.id,
          serviceId: input.serviceId,
          quoteRequestId: input.quoteRequestId,
          idempotencyKey: input.idempotencyKey,
          ...legacy,
          scheduledStart: input.scheduledStart,
          scheduledEnd: input.scheduledEnd,
          notes: input.notes,
          amountCents,
          totalPrice: amountCents === undefined ? undefined : amountCents / 100,
          serviceAddress: input.serviceAddress,
          serviceCity: input.serviceCity,
          serviceState: input.serviceState,
          serviceZipCode: input.serviceZipCode,
          serviceLatitude: input.serviceLatitude,
          serviceLongitude: input.serviceLongitude,
          workOrder: { create: { status: WorkOrderStatus.SCHEDULED } },
        },
        include: { workOrder: true, business: true, service: true },
      });

      await tx.notification.create({
        data: {
          userId: business.ownerId,
          type: 'booking',
          title: 'New booking',
          message: `A customer requested ${service?.name ?? 'a service'}`,
          link: '/dashboard/bookings',
        },
      });
      await tx.outboxEvent.create({
        data: {
          topic: 'booking.created',
          aggregateId: booking.id,
          idempotencyKey: `booking.created:${booking.id}`,
          payload: serialize({ bookingId: booking.id }),
        },
      });
      const analyticsDate = new Date();
      analyticsDate.setUTCHours(0, 0, 0, 0);
      await tx.businessAnalytics.upsert({
        where: { businessId_date: { businessId: input.businessId, date: analyticsDate } },
        update: { bookings: { increment: 1 } },
        create: { businessId: input.businessId, date: analyticsDate, bookings: 1 },
      });
      return booking;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function getWorkOrderForActor(actor: Actor, id: string) {
  const workOrder = await prisma.workOrder.findUnique({
    where: { id },
    include: {
      booking: {
        include: {
          business: true,
          service: { include: { requiredSkills: true } },
          user: { select: { id: true, name: true, email: true, phone: true } },
        },
      },
      dispatches: {
        include: { technician: { include: { skills: true } } },
        orderBy: { assignedAt: 'desc' },
      },
      events: { orderBy: { createdAt: 'asc' } },
      changeOrders: { orderBy: { createdAt: 'asc' } },
      invoice: { include: { payments: { include: { refunds: true } } } },
      reservations: { include: { item: true } },
    },
  });
  if (!workOrder) throw new DomainError('WORK_ORDER_NOT_FOUND', 'Work order not found', 404);
  assertWorkOrderAccess(actor, workOrder);
  return workOrder;
}

export async function assignTechnician(
  actor: Actor,
  workOrderId: string,
  technicianId: string,
  expectedVersion: number,
  reason?: string,
) {
  const workOrder = await getWorkOrderForActor(actor, workOrderId);
  if (actor.role !== 'ADMIN' && actor.id !== workOrder.booking.business.ownerId) {
    throw new DomainError('FORBIDDEN', 'Only the provider can dispatch technicians', 403);
  }
  assertExpectedVersion(workOrder.version, expectedVersion);
  if (!workOrder.booking.scheduledStart || !workOrder.booking.scheduledEnd) {
    throw new DomainError('SCHEDULE_REQUIRED', 'The booking must have an absolute schedule');
  }
  const technician = await prisma.technician.findFirst({
    where: { id: technicianId, businessId: workOrder.booking.businessId, status: 'ACTIVE' },
    include: {
      skills: true,
      availability: {
        where: {
          available: true,
          startsAt: { lte: workOrder.booking.scheduledStart },
          endsAt: { gte: workOrder.booking.scheduledEnd },
        },
      },
      dispatches: {
        where: {
          status: { in: ACTIVE_DISPATCH_STATUSES },
          workOrderId: { not: workOrderId },
          workOrder: {
            booking: {
              scheduledStart: { lt: workOrder.booking.scheduledEnd },
              scheduledEnd: { gt: workOrder.booking.scheduledStart },
            },
          },
        },
        include: { workOrder: { include: { booking: true } } },
      },
    },
  });
  if (!technician) throw new DomainError('TECHNICIAN_NOT_FOUND', 'Technician not found', 404);
  assertRequiredSkills(
    workOrder.booking.service?.requiredSkills.map((skill) => skill.name) ?? [],
    technician.skills.map((skill) => skill.name),
  );
  const window = assertInsideAvailability(
    { startsAt: workOrder.booking.scheduledStart, endsAt: workOrder.booking.scheduledEnd },
    technician.availability,
  );
  assertNoOverbooking(
    { startsAt: workOrder.booking.scheduledStart, endsAt: workOrder.booking.scheduledEnd },
    technician.dispatches.map((dispatch) => ({
      startsAt: dispatch.workOrder.booking.scheduledStart!,
      endsAt: dispatch.workOrder.booking.scheduledEnd!,
    })),
    window.capacity,
  );
  if (
    technician.homeLatitude !== null &&
    technician.homeLongitude !== null &&
    technician.maxTravelMiles !== null &&
    workOrder.booking.serviceLatitude !== null &&
    workOrder.booking.serviceLongitude !== null
  ) {
    assertWithinTravelLimit(
      { latitude: technician.homeLatitude, longitude: technician.homeLongitude },
      {
        latitude: workOrder.booking.serviceLatitude,
        longitude: workOrder.booking.serviceLongitude,
      },
      technician.maxTravelMiles,
    );
  }

  const hadAssignment = workOrder.dispatches.some((dispatch) =>
    ACTIVE_DISPATCH_STATUSES.includes(dispatch.status),
  );
  if (!hadAssignment) {
    assertWorkOrderTransition(workOrder.status as WorkOrderState, WorkOrderStatus.ASSIGNED);
  } else if (!['ASSIGNED', 'DISPATCHED', 'EN_ROUTE'].includes(workOrder.status)) {
    throw new DomainError('REASSIGN_NOT_ALLOWED', 'The work order cannot be reassigned now');
  }

  return prisma.$transaction(async (tx) => {
    await tx.dispatchAssignment.updateMany({
      where: { workOrderId, status: { in: ACTIVE_DISPATCH_STATUSES } },
      data: { status: DispatchStatus.REASSIGNED, endedAt: new Date(), reason },
    });
    const updated = await tx.workOrder.updateMany({
      where: { id: workOrderId, version: expectedVersion },
      data: { status: WorkOrderStatus.ASSIGNED, version: { increment: 1 } },
    });
    if (updated.count !== 1) {
      throw new DomainError('VERSION_CONFLICT', 'Work order changed while assigning');
    }
    const dispatch = await tx.dispatchAssignment.create({
      data: { workOrderId, technicianId, reason },
      include: { technician: { include: { skills: true } } },
    });
    await tx.jobEvent.create({
      data: {
        workOrderId,
        fromStatus: workOrder.status,
        toStatus: WorkOrderStatus.ASSIGNED,
        actorId: actor.id,
        note: reason,
        metadata: serialize({ technicianId, reassignment: hadAssignment }),
      },
    });
    await tx.outboxEvent.create({
      data: {
        topic: hadAssignment ? 'dispatch.reassigned' : 'dispatch.assigned',
        aggregateId: workOrderId,
        idempotencyKey: `dispatch:${workOrderId}:${expectedVersion + 1}`,
        payload: serialize({ workOrderId, technicianId }),
      },
    });
    return dispatch;
  });
}

export async function transitionWorkOrder(
  actor: Actor,
  workOrderId: string,
  toStatus: WorkOrderStatus,
  expectedVersion: number,
  note?: string,
  source = 'web',
) {
  const workOrder = await getWorkOrderForActor(actor, workOrderId);
  const canOperate =
    actor.role === 'ADMIN' ||
    actor.id === workOrder.booking.business.ownerId ||
    actor.businessId === workOrder.booking.businessId ||
    workOrder.dispatches.some((dispatch) => dispatch.technician.userId === actor.id);
  const customerCancellation =
    actor.id === workOrder.booking.userId && toStatus === WorkOrderStatus.CANCELLED;
  if (!canOperate && !customerCancellation) {
    throw new DomainError(
      'FORBIDDEN',
      'Customers may cancel, but only the provider or assigned technician may update job status',
      403,
    );
  }
  assertExpectedVersion(workOrder.version, expectedVersion);
  assertWorkOrderTransition(workOrder.status as WorkOrderState, toStatus as WorkOrderState);
  const activeDispatch = workOrder.dispatches.find((dispatch) =>
    ACTIVE_DISPATCH_STATUSES.includes(dispatch.status),
  );
  if (
    ['DISPATCHED', 'EN_ROUTE', 'IN_PROGRESS', 'PAUSED', 'PARTIALLY_COMPLETED', 'COMPLETED'].includes(
      toStatus,
    ) &&
    !activeDispatch
  ) {
    throw new DomainError('TECHNICIAN_REQUIRED', 'A technician must be assigned first');
  }

  return prisma.$transaction(async (tx) => {
    const timestamps: Prisma.WorkOrderUpdateManyMutationInput = {};
    if (toStatus === WorkOrderStatus.IN_PROGRESS && !workOrder.startedAt) timestamps.startedAt = new Date();
    if (toStatus === WorkOrderStatus.COMPLETED) timestamps.completedAt = new Date();
    if (toStatus === WorkOrderStatus.NO_SHOW) timestamps.noShowAt = new Date();
    const updated = await tx.workOrder.updateMany({
      where: { id: workOrderId, version: expectedVersion },
      data: { status: toStatus, version: { increment: 1 }, ...timestamps },
    });
    if (updated.count !== 1) throw new DomainError('VERSION_CONFLICT', 'Work order changed');
    if (toStatus === WorkOrderStatus.COMPLETED) {
      await tx.booking.update({
        where: { id: workOrder.bookingId },
        data: { status: BookingStatus.COMPLETED },
      });
      await tx.dispatchAssignment.updateMany({
        where: { workOrderId, status: { in: ACTIVE_DISPATCH_STATUSES } },
        data: { status: DispatchStatus.COMPLETED, endedAt: new Date() },
      });
    }
    if (toStatus === WorkOrderStatus.CANCELLED) {
      await tx.booking.update({
        where: { id: workOrder.bookingId },
        data: { status: BookingStatus.CANCELLED, cancelledAt: new Date(), cancellationReason: note },
      });
      await tx.dispatchAssignment.updateMany({
        where: { workOrderId, status: { in: ACTIVE_DISPATCH_STATUSES } },
        data: { status: DispatchStatus.CANCELLED, endedAt: new Date(), reason: note },
      });
    }
    await tx.jobEvent.create({
      data: {
        workOrderId,
        fromStatus: workOrder.status,
        toStatus,
        actorId: actor.id,
        source,
        note,
      },
    });
    await tx.outboxEvent.create({
      data: {
        topic: `work-order.${toStatus.toLowerCase().replaceAll('_', '-')}`,
        aggregateId: workOrderId,
        idempotencyKey: `work-order:${workOrderId}:${expectedVersion + 1}`,
        payload: serialize({ workOrderId, toStatus, note }),
      },
    });
    return tx.workOrder.findUniqueOrThrow({ where: { id: workOrderId } });
  });
}

export async function rescheduleWorkOrder(
  actor: Actor,
  workOrderId: string,
  expectedVersion: number,
  scheduledStart: Date,
  scheduledEnd: Date,
  reason?: string,
) {
  const workOrder = await getWorkOrderForActor(actor, workOrderId);
  if (
    actor.role !== 'ADMIN' &&
    actor.id !== workOrder.booking.userId &&
    actor.id !== workOrder.booking.business.ownerId &&
    actor.businessId !== workOrder.booking.businessId
  ) {
    throw new DomainError('FORBIDDEN', 'Only the customer or provider can reschedule', 403);
  }
  assertExpectedVersion(workOrder.version, expectedVersion);
  if (!['PENDING', 'CONFIRMED'].includes(workOrder.booking.status)) {
    throw new DomainError('RESCHEDULE_NOT_ALLOWED', 'This booking can no longer be rescheduled');
  }
  if (scheduledStart >= scheduledEnd) {
    throw new DomainError('INVALID_TIME_RANGE', 'Start must be before end', 400);
  }
  const windows = await prisma.availabilityWindow.findMany({
    where: {
      businessId: workOrder.booking.businessId,
      technicianId: null,
      available: true,
      startsAt: { lte: scheduledStart },
      endsAt: { gte: scheduledEnd },
    },
  });
  const window = assertInsideAvailability({ startsAt: scheduledStart, endsAt: scheduledEnd }, windows);
  const conflicts = await prisma.booking.findMany({
    where: {
      id: { not: workOrder.bookingId },
      businessId: workOrder.booking.businessId,
      status: { not: BookingStatus.CANCELLED },
      scheduledStart: { lt: scheduledEnd },
      scheduledEnd: { gt: scheduledStart },
    },
    select: { scheduledStart: true, scheduledEnd: true },
  });
  assertNoOverbooking(
    { startsAt: scheduledStart, endsAt: scheduledEnd },
    conflicts
      .filter(
        (booking): booking is { scheduledStart: Date; scheduledEnd: Date } =>
          booking.scheduledStart !== null && booking.scheduledEnd !== null,
      )
      .map((booking) => ({ startsAt: booking.scheduledStart, endsAt: booking.scheduledEnd })),
    window.capacity,
  );
  const activeDispatch = workOrder.dispatches.find((dispatch) =>
    ACTIVE_DISPATCH_STATUSES.includes(dispatch.status),
  );
  if (activeDispatch) {
    const technician = await prisma.technician.findUnique({
      where: { id: activeDispatch.technicianId },
      include: {
        availability: {
          where: {
            available: true,
            startsAt: { lte: scheduledStart },
            endsAt: { gte: scheduledEnd },
          },
        },
        dispatches: {
          where: {
            workOrderId: { not: workOrderId },
            status: { in: ACTIVE_DISPATCH_STATUSES },
            workOrder: {
              booking: {
                scheduledStart: { lt: scheduledEnd },
                scheduledEnd: { gt: scheduledStart },
              },
            },
          },
          include: { workOrder: { include: { booking: true } } },
        },
      },
    });
    if (!technician) {
      throw new DomainError('TECHNICIAN_NOT_FOUND', 'Assigned technician no longer exists', 409);
    }
    const technicianWindow = assertInsideAvailability(
      { startsAt: scheduledStart, endsAt: scheduledEnd },
      technician.availability,
    );
    assertNoOverbooking(
      { startsAt: scheduledStart, endsAt: scheduledEnd },
      technician.dispatches
        .filter(
          (dispatch) =>
            dispatch.workOrder.booking.scheduledStart !== null &&
            dispatch.workOrder.booking.scheduledEnd !== null,
        )
        .map((dispatch) => ({
          startsAt: dispatch.workOrder.booking.scheduledStart!,
          endsAt: dispatch.workOrder.booking.scheduledEnd!,
        })),
      technicianWindow.capacity,
    );
  }
  const legacy = legacyDateFields(scheduledStart, scheduledEnd);
  return prisma.$transaction(async (tx) => {
    const targetStatus = activeDispatch ? WorkOrderStatus.ASSIGNED : WorkOrderStatus.SCHEDULED;
    const updated = await tx.workOrder.updateMany({
      where: { id: workOrderId, version: expectedVersion },
      data: {
        status: targetStatus,
        version: { increment: 1 },
      },
    });
    if (updated.count !== 1) throw new DomainError('VERSION_CONFLICT', 'Work order changed');
    await tx.booking.update({
      where: { id: workOrder.bookingId },
      data: { scheduledStart, scheduledEnd, ...legacy },
    });
    await tx.jobEvent.create({
      data: {
        workOrderId,
        fromStatus: workOrder.status,
        toStatus: targetStatus,
        actorId: actor.id,
        note: reason,
        metadata: serialize({ scheduledStart, scheduledEnd }),
      },
    });
    await tx.outboxEvent.create({
      data: {
        topic: 'booking.rescheduled',
        aggregateId: workOrder.bookingId,
        idempotencyKey: `booking.rescheduled:${workOrder.bookingId}:${expectedVersion + 1}`,
        payload: serialize({ bookingId: workOrder.bookingId, scheduledStart, scheduledEnd }),
      },
    });
    return tx.workOrder.findUniqueOrThrow({ where: { id: workOrderId }, include: { booking: true } });
  });
}

export async function requestChangeOrder(
  actor: Actor,
  workOrderId: string,
  expectedVersion: number,
  description: string,
  amountDeltaCents: number,
) {
  const workOrder = await getWorkOrderForActor(actor, workOrderId);
  assertExpectedVersion(workOrder.version, expectedVersion);
  if (!['IN_PROGRESS', 'PAUSED', 'PARTIALLY_COMPLETED'].includes(workOrder.status)) {
    throw new DomainError('CHANGE_ORDER_NOT_ALLOWED', 'Work must be underway');
  }
  if (!description.trim() || !Number.isSafeInteger(amountDeltaCents)) {
    throw new DomainError('INVALID_CHANGE_ORDER', 'Description and integer-cent amount are required', 400);
  }
  if (actor.id === workOrder.booking.userId) {
    throw new DomainError('FORBIDDEN', 'The provider must request a change order', 403);
  }
  return prisma.$transaction(async (tx) => {
    const updated = await tx.workOrder.updateMany({
      where: { id: workOrderId, version: expectedVersion },
      data: { version: { increment: 1 } },
    });
    if (updated.count !== 1) throw new DomainError('VERSION_CONFLICT', 'Work order changed');
    const changeOrder = await tx.changeOrder.create({
      data: {
        workOrderId,
        status: ChangeOrderStatus.PENDING_CUSTOMER,
        description: description.trim(),
        amountDeltaCents,
        requestedById: actor.id,
      },
    });
    await tx.outboxEvent.create({
      data: {
        topic: 'change-order.requested',
        aggregateId: changeOrder.id,
        idempotencyKey: `change-order.requested:${changeOrder.id}`,
        payload: serialize({ changeOrderId: changeOrder.id, workOrderId }),
      },
    });
    return changeOrder;
  });
}

export async function decideChangeOrder(
  actor: Actor,
  workOrderId: string,
  changeOrderId: string,
  expectedVersion: number,
  decision: 'APPROVED' | 'REJECTED',
) {
  const workOrder = await getWorkOrderForActor(actor, workOrderId);
  assertExpectedVersion(workOrder.version, expectedVersion);
  if (actor.role !== 'ADMIN' && actor.id !== workOrder.booking.userId) {
    throw new DomainError('FORBIDDEN', 'Only the customer can decide a change order', 403);
  }
  const changeOrder = workOrder.changeOrders.find((item) => item.id === changeOrderId);
  if (!changeOrder) throw new DomainError('CHANGE_ORDER_NOT_FOUND', 'Change order not found', 404);
  assertChangeOrderTransition(changeOrder.status, decision);
  return prisma.$transaction(async (tx) => {
    const updated = await tx.workOrder.updateMany({
      where: { id: workOrderId, version: expectedVersion },
      data: { version: { increment: 1 } },
    });
    if (updated.count !== 1) throw new DomainError('VERSION_CONFLICT', 'Work order changed');
    const decided = await tx.changeOrder.update({
      where: { id: changeOrderId },
      data: { status: decision, decidedById: actor.id, decidedAt: new Date() },
    });
    await tx.outboxEvent.create({
      data: {
        topic: `change-order.${decision.toLowerCase()}`,
        aggregateId: changeOrderId,
        idempotencyKey: `change-order.${decision.toLowerCase()}:${changeOrderId}`,
        payload: serialize({ changeOrderId, workOrderId }),
      },
    });
    return decided;
  });
}

export async function issueInvoice(
  actor: Actor,
  workOrderId: string,
  expectedVersion: number,
  idempotencyKey: string,
) {
  const workOrder = await getWorkOrderForActor(actor, workOrderId);
  assertExpectedVersion(workOrder.version, expectedVersion);
  if (actor.role !== 'ADMIN' && actor.id !== workOrder.booking.business.ownerId) {
    throw new DomainError('FORBIDDEN', 'Only the provider can issue an invoice', 403);
  }
  if (!['COMPLETED', 'PARTIALLY_COMPLETED'].includes(workOrder.status)) {
    throw new DomainError('WORK_NOT_BILLABLE', 'Work must be completed or partially completed');
  }
  if (workOrder.invoice) return workOrder.invoice;

  const baseCents = workOrder.booking.amountCents ??
    (workOrder.booking.totalPrice !== null ? Math.round(workOrder.booking.totalPrice * 100) : 0);
  const approvedChanges = workOrder.changeOrders.filter(
    (changeOrder) => changeOrder.status === ChangeOrderStatus.APPROVED,
  );
  const subtotalCents = approvedChanges.reduce(
    (sum, changeOrder) => sum + changeOrder.amountDeltaCents,
    baseCents,
  );
  if (!Number.isSafeInteger(subtotalCents) || subtotalCents < 0) {
    throw new DomainError('INVALID_MONEY', 'Invoice subtotal is invalid', 400);
  }

  const providers = createHttpProviders();
  let taxResult: Awaited<ReturnType<typeof providers.tax.calculate>>;
  try {
    taxResult = await providers.tax.calculate({
      amountCents: subtotalCents,
      currency: 'USD',
      destination: {
        country: 'US',
        state: workOrder.booking.serviceState ?? undefined,
        postalCode: workOrder.booking.serviceZipCode ?? undefined,
      },
      idempotencyKey: `${idempotencyKey}:tax`,
    });
  } catch (error) {
    if (error instanceof ProviderError) {
      throw new DomainError(
        `TAX_${error.code}`,
        error.message,
        error.retryable ? 502 : 503,
      );
    }
    throw error;
  }
  const totalCents = subtotalCents + taxResult.taxCents;
  const lineItems = [
    { description: workOrder.booking.service?.name ?? 'Service', amountCents: baseCents },
    ...approvedChanges.map((changeOrder) => ({
      description: changeOrder.description,
      amountCents: changeOrder.amountDeltaCents,
      changeOrderId: changeOrder.id,
    })),
  ];
  const invoiceNumber = `INV-${new Date().getUTCFullYear()}-${workOrder.id.slice(-8).toUpperCase()}`;
  return prisma.$transaction(async (tx) => {
    const updated = await tx.workOrder.updateMany({
      where: { id: workOrderId, version: expectedVersion },
      data: { version: { increment: 1 } },
    });
    if (updated.count !== 1) throw new DomainError('VERSION_CONFLICT', 'Work order changed');
    await tx.externalOperation.upsert({
      where: {
        provider_idempotencyKey: {
          provider: process.env.TAX_PROVIDER ?? 'tax',
          idempotencyKey: `${idempotencyKey}:tax`,
        },
      },
      update: { response: serialize(taxResult), status: 'SUCCEEDED', attempts: { increment: 1 } },
      create: {
        provider: process.env.TAX_PROVIDER ?? 'tax',
        capability: 'calculate-tax',
        idempotencyKey: `${idempotencyKey}:tax`,
        request: serialize({ subtotalCents }),
        response: serialize(taxResult),
        status: 'SUCCEEDED',
        attempts: 1,
      },
    });
    const invoice = await tx.invoice.create({
      data: {
        workOrderId,
        number: invoiceNumber,
        status: InvoiceStatus.OPEN,
        lineItems: serialize(lineItems),
        subtotalCents,
        taxCents: taxResult.taxCents,
        totalCents,
        balanceCents: totalCents,
        taxProviderRef: taxResult.providerReference,
        issuedAt: new Date(),
        dueAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    await tx.outboxEvent.create({
      data: {
        topic: 'invoice.issued',
        aggregateId: invoice.id,
        idempotencyKey: `invoice.issued:${invoice.id}`,
        payload: serialize({ invoiceId: invoice.id }),
      },
    });
    return invoice;
  });
}

export async function authorizeInvoicePayment(
  actor: Actor,
  invoiceId: string,
  amountCents: number,
  idempotencyKey: string,
) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      workOrder: {
        include: {
          booking: { include: { business: true } },
          dispatches: { include: { technician: true } },
        },
      },
    },
  });
  if (!invoice) throw new DomainError('INVOICE_NOT_FOUND', 'Invoice not found', 404);
  assertWorkOrderAccess(actor, invoice.workOrder);
  if (actor.role !== 'ADMIN' && actor.id !== invoice.workOrder.booking.userId) {
    throw new DomainError('FORBIDDEN', 'Only the customer can authorize payment', 403);
  }
  const existing = await prisma.payment.findUnique({ where: { idempotencyKey } });
  if (existing) {
    if (existing.invoiceId !== invoiceId || existing.amountCents !== amountCents) {
      throw new DomainError('IDEMPOTENCY_CONFLICT', 'Idempotency key belongs to another payment');
    }
    return existing;
  }
  if (
    invoice.status !== InvoiceStatus.OPEN &&
    invoice.status !== InvoiceStatus.PARTIALLY_PAID
  ) {
    throw new DomainError('INVOICE_NOT_PAYABLE', 'Invoice is not open for payment');
  }
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0 || amountCents > invoice.balanceCents) {
    throw new DomainError('INVALID_PAYMENT_TOTAL', 'Payment exceeds invoice balance', 400);
  }
  const providers = createHttpProviders();
  let result: Awaited<ReturnType<typeof providers.payment.authorize>>;
  try {
    result = await providers.payment.authorize({
      amountCents,
      currency: invoice.currency,
      customerReference: invoice.workOrder.booking.userId,
      idempotencyKey,
    });
  } catch (error) {
    if (error instanceof ProviderError) {
      throw new DomainError(
        `PAYMENT_${error.code}`,
        error.message,
        error.retryable ? 502 : 503,
      );
    }
    throw error;
  }
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        invoiceId,
        provider: process.env.PAYMENT_PROVIDER ?? 'payment',
        providerPaymentId: result.providerReference,
        idempotencyKey,
        status: result.status,
        amountCents,
        currency: invoice.currency,
      },
    });
    await tx.externalOperation.create({
      data: {
        provider: payment.provider,
        capability: 'authorize-payment',
        idempotencyKey,
        request: serialize({ invoiceId, amountCents }),
        response: serialize(result),
        status: 'SUCCEEDED',
        attempts: 1,
      },
    });
    return payment;
  });
}

export async function refundPayment(
  actor: Actor,
  paymentId: string,
  amountCents: number,
  reason: string | undefined,
  idempotencyKey: string,
) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      invoice: {
        include: {
          workOrder: {
            include: {
              booking: { include: { business: true } },
              dispatches: { include: { technician: true } },
            },
          },
        },
      },
    },
  });
  if (!payment) throw new DomainError('PAYMENT_NOT_FOUND', 'Payment not found', 404);
  assertWorkOrderAccess(actor, payment.invoice.workOrder);
  if (actor.role !== 'ADMIN' && actor.id !== payment.invoice.workOrder.booking.business.ownerId) {
    throw new DomainError('FORBIDDEN', 'Only the provider can issue a refund', 403);
  }
  const existing = await prisma.refund.findUnique({ where: { idempotencyKey } });
  if (existing) {
    if (existing.paymentId !== paymentId || existing.amountCents !== amountCents) {
      throw new DomainError('IDEMPOTENCY_CONFLICT', 'Idempotency key belongs to another refund');
    }
    return existing;
  }
  if (!payment.providerPaymentId) {
    throw new DomainError('PAYMENT_REFERENCE_MISSING', 'Provider payment reference is missing');
  }
  assertRefundAllowed(payment.capturedCents, payment.refundedCents, amountCents);
  const providers = createHttpProviders();
  let result: Awaited<ReturnType<typeof providers.payment.refund>>;
  try {
    result = await providers.payment.refund({
      paymentReference: payment.providerPaymentId,
      amountCents,
      reason,
      idempotencyKey,
    });
  } catch (error) {
    if (error instanceof ProviderError) {
      throw new DomainError(
        `PAYMENT_${error.code}`,
        error.message,
        error.retryable ? 502 : 503,
      );
    }
    throw error;
  }
  return prisma.refund.create({
    data: {
      paymentId,
      providerRefundId: result.providerReference,
      idempotencyKey,
      amountCents,
      status: PaymentStatus.REQUIRES_ACTION,
      reason,
    },
  });
}

export async function capturePayment(
  actor: Actor,
  paymentId: string,
  amountCents: number,
  idempotencyKey: string,
) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      invoice: {
        include: {
          workOrder: {
            include: {
              booking: { include: { business: true } },
              dispatches: { include: { technician: true } },
            },
          },
        },
      },
    },
  });
  if (!payment) throw new DomainError('PAYMENT_NOT_FOUND', 'Payment not found', 404);
  assertWorkOrderAccess(actor, payment.invoice.workOrder);
  if (actor.role !== 'ADMIN' && actor.id !== payment.invoice.workOrder.booking.business.ownerId) {
    throw new DomainError('FORBIDDEN', 'Only the provider can capture payment', 403);
  }
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0 || amountCents > payment.amountCents) {
    throw new DomainError('INVALID_PAYMENT_TOTAL', 'Capture exceeds the authorized amount', 400);
  }
  const existingOperation = await prisma.externalOperation.findUnique({
    where: {
      provider_idempotencyKey: { provider: payment.provider, idempotencyKey },
    },
  });
  if (existingOperation) {
    const request = existingOperation.request as Record<string, unknown>;
    if (request.paymentId !== paymentId || request.amountCents !== amountCents) {
      throw new DomainError('IDEMPOTENCY_CONFLICT', 'Idempotency key belongs to another capture');
    }
    return {
      accepted: true,
      paymentId,
      providerReference:
        typeof (existingOperation.response as Record<string, unknown> | null)?.providerReference ===
        'string'
          ? (existingOperation.response as Record<string, string>).providerReference
          : payment.providerPaymentId,
    };
  }
  if (payment.status !== PaymentStatus.AUTHORIZED || !payment.providerPaymentId) {
    throw new DomainError('PAYMENT_NOT_CAPTURABLE', 'Payment is not authorized for capture');
  }
  const providers = createHttpProviders();
  let result: Awaited<ReturnType<typeof providers.payment.capture>>;
  try {
    result = await providers.payment.capture({
      paymentReference: payment.providerPaymentId,
      amountCents,
      idempotencyKey,
    });
  } catch (error) {
    if (error instanceof ProviderError) {
      throw new DomainError(
        `PAYMENT_${error.code}`,
        error.message,
        error.retryable ? 502 : 503,
      );
    }
    throw error;
  }
  await prisma.externalOperation.upsert({
    where: {
      provider_idempotencyKey: { provider: payment.provider, idempotencyKey },
    },
    update: { response: serialize(result), status: 'SUCCEEDED', attempts: { increment: 1 } },
    create: {
      provider: payment.provider,
      capability: 'capture-payment',
      idempotencyKey,
      request: serialize({ paymentId, amountCents }),
      response: serialize(result),
      status: 'SUCCEEDED',
      attempts: 1,
    },
  });
  return { accepted: true, paymentId, providerReference: result.providerReference };
}

export async function reserveInventory(
  actor: Actor,
  workOrderId: string,
  itemId: string,
  quantity: number,
  expectedVersion: number,
) {
  const workOrder = await getWorkOrderForActor(actor, workOrderId);
  const canManageInventory =
    actor.role === 'ADMIN' ||
    actor.id === workOrder.booking.business.ownerId ||
    actor.businessId === workOrder.booking.businessId ||
    workOrder.dispatches.some((dispatch) => dispatch.technician.userId === actor.id);
  if (!canManageInventory) {
    throw new DomainError(
      'FORBIDDEN',
      'Only the provider or assigned technician can reserve inventory',
      403,
    );
  }
  assertExpectedVersion(workOrder.version, expectedVersion);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new DomainError('INVALID_QUANTITY', 'Quantity must be positive', 400);
  }
  return prisma.$transaction(
    async (tx) => {
      const item = await tx.inventoryItem.findFirst({
        where: { id: itemId, businessId: workOrder.booking.businessId },
      });
      if (!item) throw new DomainError('INVENTORY_NOT_FOUND', 'Inventory item not found', 404);
      if (item.onHandQuantity - item.reservedQuantity < quantity) {
        throw new DomainError('INSUFFICIENT_INVENTORY', 'Inventory is not available');
      }
      const changed = await tx.inventoryItem.updateMany({
        where: {
          id: itemId,
          version: item.version,
          reservedQuantity: { lte: item.onHandQuantity - quantity },
        },
        data: { reservedQuantity: { increment: quantity }, version: { increment: 1 } },
      });
      if (changed.count !== 1) {
        throw new DomainError('INVENTORY_CONFLICT', 'Inventory changed while reserving');
      }
      const updated = await tx.workOrder.updateMany({
        where: { id: workOrderId, version: expectedVersion },
        data: { version: { increment: 1 } },
      });
      if (updated.count !== 1) throw new DomainError('VERSION_CONFLICT', 'Work order changed');
      return tx.inventoryReservation.upsert({
        where: { workOrderId_itemId: { workOrderId, itemId } },
        update: { quantity: { increment: quantity } },
        create: { workOrderId, itemId, quantity },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function recordOfflineCommand(
  actor: Actor,
  input: {
    deviceId: string;
    clientCommandId: string;
    workOrderId: string;
    expectedVersion: number;
    command: string;
    payload: Record<string, unknown>;
  },
) {
  const existing = await prisma.offlineCommand.findUnique({
    where: {
      deviceId_clientCommandId: {
        deviceId: input.deviceId,
        clientCommandId: input.clientCommandId,
      },
    },
  });
  if (existing) return existing;
  const workOrder = await getWorkOrderForActor(actor, input.workOrderId);
  const command = await prisma.offlineCommand.create({
    data: {
      deviceId: input.deviceId,
      clientCommandId: input.clientCommandId,
      submittedById: actor.id,
      aggregateType: 'work-order',
      aggregateId: input.workOrderId,
      expectedVersion: input.expectedVersion,
      command: input.command,
      payload: serialize(input.payload),
    },
  });
  if (workOrder.version !== input.expectedVersion) {
    return prisma.offlineCommand.update({
      where: { id: command.id },
      data: {
        status: OfflineCommandStatus.CONFLICT,
        conflictReason: `Expected version ${input.expectedVersion}; current version ${workOrder.version}`,
      },
    });
  }
  try {
    if (input.command === 'TRANSITION') {
      const toStatus = input.payload.toStatus;
      if (typeof toStatus !== 'string' || !(toStatus in WorkOrderStatus)) {
        throw new DomainError('INVALID_COMMAND', 'Offline transition status is invalid', 400);
      }
      await transitionWorkOrder(
        actor,
        input.workOrderId,
        toStatus as WorkOrderStatus,
        input.expectedVersion,
        typeof input.payload.note === 'string' ? input.payload.note : undefined,
        'offline',
      );
    } else {
      throw new DomainError('INVALID_COMMAND', 'Offline command is not supported', 400);
    }
    return prisma.offlineCommand.update({
      where: { id: command.id },
      data: { status: OfflineCommandStatus.APPLIED, appliedAt: new Date() },
    });
  } catch (error) {
    return prisma.offlineCommand.update({
      where: { id: command.id },
      data: {
        status: error instanceof DomainError && error.code === 'VERSION_CONFLICT'
          ? OfflineCommandStatus.CONFLICT
          : OfflineCommandStatus.REJECTED,
        conflictReason: error instanceof Error ? error.message : 'Command rejected',
      },
    });
  }
}

export function domainErrorResponse(error: unknown): { status: number; body: { error: string; code: string } } {
  if (error instanceof DomainError) {
    return { status: error.status, body: { error: error.message, code: error.code } };
  }
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    return {
      status: 409,
      body: { error: 'The operation has already been submitted', code: 'DUPLICATE_OPERATION' },
    };
  }
  return { status: 500, body: { error: 'Unexpected server error', code: 'INTERNAL_ERROR' } };
}

export const pendingOutboxStatus = OutboxStatus.PENDING;
