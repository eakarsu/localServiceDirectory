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

    if (session.user.role !== 'BUSINESS_OWNER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: any = {};

    if (session.user.businessId) {
      where.businessId = session.user.businessId;
    }

    if (status) {
      where.status = status;
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          business: { select: { id: true, name: true } },
        },
        orderBy: [{ aiScore: 'desc' }, { createdAt: 'desc' }],
        take: limit,
        skip,
      }),
      prisma.lead.count({ where }),
    ]);

    return NextResponse.json({
      leads,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leads' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Generate AI lead score based on various factors
    let aiScore = 0.5;

    if (data.phone) aiScore += 0.15;
    if (data.email?.includes('@gmail.com') || data.email?.includes('@yahoo.com')) aiScore += 0.05;
    if (data.source === 'referral') aiScore += 0.2;
    if (data.source === 'search') aiScore += 0.1;
    aiScore = Math.min(aiScore, 1);

    const lead = await prisma.lead.create({
      data: {
        businessId: data.businessId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        source: data.source || 'website',
        notes: data.notes,
        aiScore,
      },
    });

    // Get business owner
    const business = await prisma.business.findUnique({
      where: { id: data.businessId },
      select: { ownerId: true, name: true },
    });

    if (business) {
      await prisma.notification.create({
        data: {
          userId: business.ownerId,
          type: 'lead',
          title: 'New Lead',
          message: `New lead from ${data.name} (Score: ${Math.round(aiScore * 100)}%)`,
          link: '/dashboard/leads',
        },
      });
    }

    return NextResponse.json(lead);
  } catch (error) {
    console.error('Error creating lead:', error);
    return NextResponse.json(
      { error: 'Failed to create lead' },
      { status: 500 }
    );
  }
}
