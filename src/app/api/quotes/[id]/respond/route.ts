import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { QuoteStatus } from '@prisma/client';
import { z } from 'zod';

const responseSchema = z.object({
  amountCents: z.number().int().nonnegative(),
  description: z.string().min(1).max(5000),
  validDays: z.number().int().min(1).max(90).default(7),
  terms: z.string().max(5000).optional(),
});

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

    const parsed = responseSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid quote response', issues: parsed.error.flatten() },
        { status: 400 },
      );
    }
    if (quoteRequest.status !== QuoteStatus.PENDING && quoteRequest.status !== QuoteStatus.DRAFT) {
      return NextResponse.json({ error: 'Quote request is no longer open' }, { status: 409 });
    }

    const validUntil = new Date();
    validUntil.setUTCDate(validUntil.getUTCDate() + parsed.data.validDays);

    const quote = await prisma.$transaction(async (tx) => {
      const created = await tx.quote.create({
        data: {
          quoteRequestId: id,
          price: parsed.data.amountCents / 100,
          amountCents: parsed.data.amountCents,
          description: parsed.data.description,
          terms: parsed.data.terms,
          validUntil,
        },
      });
      await tx.quoteRequest.update({ where: { id }, data: { status: QuoteStatus.SENT } });
      await tx.notification.create({
        data: {
          userId: quoteRequest.userId,
          type: 'quote',
          title: 'Quote received',
          message: `${quoteRequest.business.name} sent a quote`,
          link: '/my-bookings',
        },
      });
      await tx.outboxEvent.create({
        data: {
          topic: 'quote.sent',
          aggregateId: id,
          idempotencyKey: `quote.sent:${id}:${created.version}`,
          payload: { quoteRequestId: id, quoteId: created.id },
        },
      });
      return created;
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
