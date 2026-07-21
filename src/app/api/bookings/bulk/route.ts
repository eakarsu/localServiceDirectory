import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function DELETE(request: NextRequest) {
  void request;
  return NextResponse.json(
    { error: 'Bookings are retained for audit and cannot be bulk deleted' },
    { status: 405, headers: { Allow: 'PATCH' } },
  );
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ids, data } = await request.json().catch(() => ({}));
    if (!ids || !Array.isArray(ids) || ids.length === 0 || ids.length > 100) {
      return NextResponse.json({ error: 'Provide 1-100 booking IDs' }, { status: 400 });
    }
    if (data?.status !== 'CONFIRMED' || Object.keys(data).length !== 1) {
      return NextResponse.json(
        { error: 'Bulk updates only support confirming pending bookings' },
        { status: 400 },
      );
    }
    const bookings = await prisma.booking.findMany({
      where: { id: { in: ids }, status: 'PENDING', business: { ownerId: session.user.id } },
      select: { id: true },
    });
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.booking.updateMany({
        where: { id: { in: bookings.map((booking) => booking.id) }, status: 'PENDING' },
        data: { status: 'CONFIRMED' },
      });
      await Promise.all(
        bookings.map((booking) =>
          tx.outboxEvent.upsert({
            where: { idempotencyKey: `booking.confirmed:${booking.id}` },
            update: {},
            create: {
              topic: 'booking.confirmed',
              aggregateId: booking.id,
              idempotencyKey: `booking.confirmed:${booking.id}`,
              payload: { bookingId: booking.id },
            },
          }),
        ),
      );
      return updated;
    });
    return NextResponse.json({ updated: result.count });
  } catch (error) {
    console.error('Bulk update bookings error:', error);
    return NextResponse.json({ error: 'Failed to update bookings' }, { status: 500 });
  }
}
