import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { Prisma, QuoteStatus } from '@prisma/client';
import { z } from 'zod';

const quoteRequestSchema = z.object({
  businessId: z.string().min(1),
  serviceDescription: z.string().min(10).max(2000),
  details: z.string().max(5000).optional(),
  preferredDate: z.string().datetime().optional(),
  budget: z.string().max(100).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const status = z.nativeEnum(QuoteStatus).safeParse(searchParams.get('status')).data;
    if (searchParams.has('status') && !status) {
      return NextResponse.json({ error: 'Invalid quote status' }, { status: 400 });
    }
    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('limit') || '20', 10) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (session.user.role === 'BUSINESS_OWNER' && session.user.businessId) {
      where.businessId = session.user.businessId;
    } else if (session.user.role === 'BUSINESS_OWNER') {
      return NextResponse.json({ error: 'Business account is not configured' }, { status: 403 });
    } else if (session.user.role === 'CONSUMER') {
      where.userId = session.user.id;
    } else if (session.user.role === 'ADMIN') {
      if (businessId) where.businessId = businessId;
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (status) {
      where.status = status;
    }

    const [quoteRequests, total] = await Promise.all([
      prisma.quoteRequest.findMany({
        where,
        include: {
          business: { select: { id: true, name: true, slug: true } },
          user: { select: { id: true, name: true, email: true, phone: true } },
          quote: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      prisma.quoteRequest.count({ where }),
    ]);

    return NextResponse.json({
      quoteRequests,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching quote requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quote requests' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = quoteRequestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid quote request', issues: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const idempotencyKey = request.headers.get('idempotency-key');
    if (!idempotencyKey) {
      return NextResponse.json({ error: 'Idempotency-Key header is required' }, { status: 400 });
    }
    const existing = await prisma.quoteRequest.findUnique({ where: { idempotencyKey } });
    if (existing) {
      if (existing.userId !== session.user.id) {
        return NextResponse.json({ error: 'Idempotency key conflict' }, { status: 409 });
      }
      return NextResponse.json(existing);
    }
    const quoteRequest = await prisma.$transaction(
      async (tx) => {
        const business = await tx.business.findFirst({
          where: { id: parsed.data.businessId, active: true },
        });
        if (!business) throw new Error('BUSINESS_NOT_FOUND');
        const created = await tx.quoteRequest.create({
          data: {
            ...parsed.data,
            preferredDate: parsed.data.preferredDate
              ? new Date(parsed.data.preferredDate)
              : undefined,
            userId: session.user.id,
            idempotencyKey,
            status: QuoteStatus.PENDING,
          },
          include: {
            business: { select: { id: true, name: true, slug: true, ownerId: true } },
          },
        });
        await tx.notification.create({
          data: {
            userId: business.ownerId,
            type: 'quote',
            title: 'New quote request',
            message: `${session.user.name} requested a quote`,
            link: '/dashboard/bookings',
          },
        });
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        await tx.businessAnalytics.upsert({
          where: { businessId_date: { businessId: business.id, date: today } },
          update: { quoteRequests: { increment: 1 } },
          create: { businessId: business.id, date: today, quoteRequests: 1 },
        });
        await tx.outboxEvent.create({
          data: {
            topic: 'quote.requested',
            aggregateId: created.id,
            idempotencyKey: `quote.requested:${created.id}`,
            payload: { quoteRequestId: created.id },
          },
        });
        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return NextResponse.json(quoteRequest, { status: 201 });
  } catch (error) {
    console.error('Error creating quote request:', error);
    if (error instanceof Error && error.message === 'BUSINESS_NOT_FOUND') {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Failed to create quote request' },
      { status: 500 }
    );
  }
}
