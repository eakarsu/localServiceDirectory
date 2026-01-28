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

    const quoteRequest = await prisma.quoteRequest.findUnique({
      where: { id },
      include: { business: true },
    });

    if (!quoteRequest) {
      return NextResponse.json({ error: 'Quote request not found' }, { status: 404 });
    }

    if (quoteRequest.business.ownerId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { price, description, validDays } = await request.json();

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + (validDays || 7));

    const quote = await prisma.quote.create({
      data: {
        quoteRequestId: id,
        price,
        description,
        validUntil,
      },
    });

    await prisma.quoteRequest.update({
      where: { id },
      data: { status: 'SENT' },
    });

    // Notify user
    await prisma.notification.create({
      data: {
        userId: quoteRequest.userId,
        type: 'quote',
        title: 'Quote Received',
        message: `${quoteRequest.business.name} sent you a quote for $${price}`,
        link: '/my-bookings',
      },
    });

    return NextResponse.json(quote);
  } catch (error) {
    console.error('Error responding to quote:', error);
    return NextResponse.json(
      { error: 'Failed to respond to quote' },
      { status: 500 }
    );
  }
}
