import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ids } = await request.json();
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });
    }

    const result = await prisma.booking.deleteMany({
      where: {
        id: { in: ids },
        business: { ownerId: session.user.id },
      },
    });

    return NextResponse.json({ deleted: result.count });
  } catch (error) {
    console.error('Bulk delete bookings error:', error);
    return NextResponse.json({ error: 'Failed to delete bookings' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ids, data } = await request.json();
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });
    }

    const result = await prisma.booking.updateMany({
      where: {
        id: { in: ids },
        business: { ownerId: session.user.id },
      },
      data,
    });

    return NextResponse.json({ updated: result.count });
  } catch (error) {
    console.error('Bulk update bookings error:', error);
    return NextResponse.json({ error: 'Failed to update bookings' }, { status: 500 });
  }
}
