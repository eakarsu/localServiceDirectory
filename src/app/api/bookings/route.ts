import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import {
  createBookingWorkflow,
  domainErrorResponse,
} from '@/lib/field-service/service';
import { createHttpProviders, ProviderError } from '@/lib/providers/contracts';
import { DomainError } from '@/lib/field-service/policy';
import { BookingStatus, Prisma } from '@prisma/client';

const createBookingSchema = z.object({
  businessId: z.string().min(1),
  serviceId: z.string().min(1).optional(),
  quoteRequestId: z.string().min(1).optional(),
  scheduledStart: z.string().datetime().optional(),
  scheduledEnd: z.string().datetime().optional(),
  date: z.string().min(1).optional(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  durationMinutes: z.number().int().min(15).max(24 * 60).optional(),
  notes: z.string().max(4000).optional(),
  serviceAddress: z.string().max(300).optional(),
  serviceCity: z.string().max(100).optional(),
  serviceState: z.string().max(100).optional(),
  serviceZipCode: z.string().max(20).optional(),
  serviceLatitude: z.number().min(-90).max(90).optional(),
  serviceLongitude: z.number().min(-180).max(180).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const status = z.nativeEnum(BookingStatus).safeParse(searchParams.get('status')).data;
    if (searchParams.has('status') && !status) {
      return NextResponse.json({ error: 'Invalid booking status' }, { status: 400 });
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

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          business: {
            select: { id: true, name: true, slug: true, phone: true, address: true },
          },
          service: {
            select: { id: true, name: true, price: true, duration: true },
          },
          user: {
            select: { id: true, name: true, email: true, phone: true },
          },
        },
        orderBy: { date: 'desc' },
        take: limit,
        skip,
      }),
      prisma.booking.count({ where }),
    ]);

    return NextResponse.json({
      bookings,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
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

    const parsed = createBookingSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid booking request', code: 'VALIDATION_ERROR', issues: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const idempotencyKey = request.headers.get('idempotency-key');
    if (!idempotencyKey) {
      return NextResponse.json(
        { error: 'Idempotency-Key header is required', code: 'IDEMPOTENCY_KEY_REQUIRED' },
        { status: 400 },
      );
    }
    let scheduledStart: Date;
    if (parsed.data.scheduledStart) {
      scheduledStart = new Date(parsed.data.scheduledStart);
    } else if (parsed.data.date && parsed.data.startTime) {
      scheduledStart = new Date(`${parsed.data.date.slice(0, 10)}T${parsed.data.startTime}:00.000Z`);
    } else {
      return NextResponse.json(
        { error: 'scheduledStart or date and startTime are required', code: 'SCHEDULE_REQUIRED' },
        { status: 400 },
      );
    }
    const scheduledEnd = parsed.data.scheduledEnd
      ? new Date(parsed.data.scheduledEnd)
      : new Date(scheduledStart.getTime() + (parsed.data.durationMinutes ?? 60) * 60_000);
    let serviceLatitude = parsed.data.serviceLatitude;
    let serviceLongitude = parsed.data.serviceLongitude;
    if (
      parsed.data.serviceAddress &&
      (serviceLatitude === undefined || serviceLongitude === undefined)
    ) {
      try {
        const mapResult = await createHttpProviders().maps.geocode(
          [
            parsed.data.serviceAddress,
            parsed.data.serviceCity,
            parsed.data.serviceState,
            parsed.data.serviceZipCode,
          ]
            .filter(Boolean)
            .join(', '),
          `${idempotencyKey}:geocode`,
        );
        serviceLatitude = mapResult.latitude;
        serviceLongitude = mapResult.longitude;
        const responsePayload = JSON.parse(JSON.stringify(mapResult)) as Prisma.InputJsonValue;
        await prisma.externalOperation.upsert({
          where: {
            provider_idempotencyKey: {
              provider: process.env.MAPS_PROVIDER ?? 'maps',
              idempotencyKey: `${idempotencyKey}:geocode`,
            },
          },
          update: { response: responsePayload, status: 'SUCCEEDED' },
          create: {
            provider: process.env.MAPS_PROVIDER ?? 'maps',
            capability: 'geocode',
            idempotencyKey: `${idempotencyKey}:geocode`,
            request: { address: parsed.data.serviceAddress },
            response: responsePayload,
            status: 'SUCCEEDED',
            attempts: 1,
          },
        });
      } catch (error) {
        if (error instanceof ProviderError) {
          throw new DomainError(
            `MAPS_${error.code}`,
            error.message,
            error.retryable ? 502 : 503,
          );
        }
        throw error;
      }
    }
    const booking = await createBookingWorkflow(
      {
        id: session.user.id,
        role: session.user.role,
        businessId: session.user.businessId,
      },
      {
        ...parsed.data,
        scheduledStart,
        scheduledEnd,
        idempotencyKey,
        serviceLatitude,
        serviceLongitude,
      },
    );
    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    console.error('Error creating booking:', error);
    const response = domainErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
