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

    // Delete associated review responses first
    await prisma.reviewResponse.deleteMany({
      where: { reviewId: { in: ids } },
    });

    const result = await prisma.review.deleteMany({
      where: {
        id: { in: ids },
        business: { ownerId: session.user.id },
      },
    });

    return NextResponse.json({ deleted: result.count });
  } catch (error) {
    console.error('Bulk delete reviews error:', error);
    return NextResponse.json({ error: 'Failed to delete reviews' }, { status: 500 });
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

    const result = await prisma.review.updateMany({
      where: {
        id: { in: ids },
        business: { ownerId: session.user.id },
      },
      data,
    });

    return NextResponse.json({ updated: result.count });
  } catch (error) {
    console.error('Bulk update reviews error:', error);
    return NextResponse.json({ error: 'Failed to update reviews' }, { status: 500 });
  }
}
