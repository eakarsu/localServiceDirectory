import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { BookingStatus } from '@prisma/client';
import { assertBookingTransition, DomainError } from '@/lib/field-service/policy';
import { domainErrorResponse, transitionWorkOrder } from '@/lib/field-service/service';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { business: true, workOrder: true },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check authorization
    const isOwner = booking.userId === session.user.id;
    const isBusinessOwner = booking.business.ownerId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';

    if (!isOwner && !isBusinessOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data = await request.json().catch(() => ({}));
    if (data.status !== BookingStatus.CONFIRMED && data.status !== BookingStatus.CANCELLED) {
      throw new DomainError(
        'WORKFLOW_COMMAND_REQUIRED',
        'Use the work-order command endpoint for dispatch and job-status changes',
        400,
      );
    }
    assertBookingTransition(booking.status, data.status);
    if (data.status === BookingStatus.CONFIRMED) {
      if (!isBusinessOwner && !isAdmin) {
        throw new DomainError('FORBIDDEN', 'Only the provider can confirm a booking', 403);
      }
      const updatedBooking = await prisma.$transaction(async (tx) => {
        const updated = await tx.booking.update({
          where: { id },
          data: { status: BookingStatus.CONFIRMED },
          include: {
            business: { select: { id: true, name: true, slug: true } },
            service: { select: { id: true, name: true } },
            user: { select: { id: true, name: true, email: true } },
            workOrder: true,
          },
        });
        await tx.outboxEvent.create({
          data: {
            topic: 'booking.confirmed',
            aggregateId: id,
            idempotencyKey: `booking.confirmed:${id}`,
            payload: { bookingId: id },
          },
        });
        return updated;
      });
      return NextResponse.json(updatedBooking);
    }
    if (!booking.workOrder) throw new DomainError('WORK_ORDER_NOT_FOUND', 'Work order not found', 404);
    const updatedWorkOrder = await transitionWorkOrder(
      {
        id: session.user.id,
        role: session.user.role,
        businessId: session.user.businessId,
      },
      booking.workOrder.id,
      'CANCELLED',
      booking.workOrder.version,
      typeof data.reason === 'string' ? data.reason : 'Cancelled by user',
    );
    return NextResponse.json(updatedWorkOrder);
  } catch (error) {
    console.error('Error updating booking:', error);
    const response = domainErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  void request;
  void params;
  return NextResponse.json(
    { error: 'Bookings are retained for audit; cancel the booking instead' },
    { status: 405, headers: { Allow: 'PUT' } },
  );
}
