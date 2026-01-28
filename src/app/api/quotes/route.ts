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

    const data = await request.json();

    // Generate AI estimate based on service description
    const aiEstimate = generateAIEstimate(data.serviceDescription, data.details);

    const quoteRequest = await prisma.quoteRequest.create({
      data: {
        businessId: data.businessId,
        userId: session.user.id,
        serviceDescription: data.serviceDescription,
        details: data.details,
        preferredDate: data.preferredDate ? new Date(data.preferredDate) : null,
        budget: data.budget,
        aiEstimate,
      },
      include: {
        business: { select: { id: true, name: true, slug: true, ownerId: true } },
      },
    });

    // Create notification for business owner
    await prisma.notification.create({
      data: {
        userId: quoteRequest.business.ownerId,
        type: 'quote',
        title: 'New Quote Request',
        message: `${session.user.name} requested a quote for: ${data.serviceDescription.substring(0, 50)}...`,
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
      update: { quoteRequests: { increment: 1 } },
      create: {
        businessId: data.businessId,
        date: today,
        quoteRequests: 1,
      },
    });

    return NextResponse.json(quoteRequest);
  } catch (error) {
    console.error('Error creating quote request:', error);
    return NextResponse.json(
      { error: 'Failed to create quote request' },
      { status: 500 }
    );
  }
}

function generateAIEstimate(serviceDescription: string, details?: string): number {
  // Simple estimate generator - replace with actual AI in production
  const text = `${serviceDescription} ${details || ''}`.toLowerCase();
  let basePrice = 100;

  // Keywords that affect pricing
  if (text.includes('emergency') || text.includes('urgent')) basePrice *= 1.5;
  if (text.includes('installation') || text.includes('install')) basePrice *= 2;
  if (text.includes('replacement') || text.includes('replace')) basePrice *= 2.5;
  if (text.includes('repair')) basePrice *= 1.3;
  if (text.includes('inspection') || text.includes('check')) basePrice *= 0.8;
  if (text.includes('maintenance')) basePrice *= 1.2;
  if (text.includes('large') || text.includes('whole house')) basePrice *= 2;
  if (text.includes('small') || text.includes('minor')) basePrice *= 0.7;

  return Math.round(basePrice);
}
