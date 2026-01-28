import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: any = {};

    if (session.user.role === 'BUSINESS_OWNER' && session.user.businessId) {
      where.businessId = session.user.businessId;
    } else if (session.user.role === 'CONSUMER') {
      where.userId = session.user.id;
    } else if (businessId) {
      where.businessId = businessId;
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

    const data = await request.json();

    // Get service details for price
    let totalPrice = data.totalPrice;
    if (data.serviceId && !totalPrice) {
      const service = await prisma.service.findUnique({
        where: { id: data.serviceId },
      });
      totalPrice = service?.price;
    }

    const booking = await prisma.booking.create({
      data: {
        businessId: data.businessId,
        userId: session.user.id,
        serviceId: data.serviceId,
        date: new Date(data.date),
        startTime: data.startTime,
        endTime: data.endTime,
        notes: data.notes,
        totalPrice,
      },
      include: {
        business: { select: { id: true, name: true, slug: true, ownerId: true } },
        service: { select: { id: true, name: true } },
      },
    });

    // Create notification for business owner
    await prisma.notification.create({
      data: {
        userId: booking.business.ownerId,
        type: 'booking',
        title: 'New Booking',
        message: `${session.user.name} booked ${booking.service?.name || 'a service'} for ${new Date(data.date).toLocaleDateString()}`,
        link: '/dashboard/bookings',
      },
    });

    // Track analytics
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.businessAnalytics.upsert({
      where: {
        businessId_date: {
          businessId: data.businessId,
          date: today,
        },
      },
      update: { bookings: { increment: 1 } },
      create: {
        businessId: data.businessId,
        date: today,
        bookings: 1,
      },
    });

    return NextResponse.json(booking);
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}
