import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const review = await prisma.review.findUnique({
      where: { id },
      include: { business: true },
    });

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    if (review.business.ownerId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { content } = await request.json();

    const response = await prisma.reviewResponse.upsert({
      where: { reviewId: id },
      update: { content },
      create: {
        reviewId: id,
        content,
      },
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error creating review response:', error);
    return NextResponse.json(
      { error: 'Failed to create review response' },
      { status: 500 }
    );
  }
}
