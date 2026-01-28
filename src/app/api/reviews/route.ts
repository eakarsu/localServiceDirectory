import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: any = {};

    if (businessId) {
      where.businessId = businessId;
      where.status = 'APPROVED';
    }

    if (userId) {
      where.userId = userId;
    }

    if (status) {
      where.status = status;
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, avatar: true } },
          business: { select: { id: true, name: true, slug: true } },
          photos: true,
          response: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      prisma.review.count({ where }),
    ]);

    return NextResponse.json({
      reviews,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
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

    // Check if user already reviewed this business
    const existingReview = await prisma.review.findFirst({
      where: {
        businessId: data.businessId,
        userId: session.user.id,
      },
    });

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this business' },
        { status: 400 }
      );
    }

    // Simple sentiment analysis (replace with actual AI in production)
    const content = data.content.toLowerCase();
    let aiSentiment = 'neutral';
    let aiScore = 0.5;

    const positiveWords = ['great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'best', 'highly recommend'];
    const negativeWords = ['terrible', 'awful', 'horrible', 'worst', 'never', 'avoid', 'disappointed', 'bad'];

    const positiveCount = positiveWords.filter(word => content.includes(word)).length;
    const negativeCount = negativeWords.filter(word => content.includes(word)).length;

    if (positiveCount > negativeCount) {
      aiSentiment = 'positive';
      aiScore = 0.7 + (data.rating / 5) * 0.3;
    } else if (negativeCount > positiveCount) {
      aiSentiment = 'negative';
      aiScore = 0.3 - (negativeCount * 0.05);
    }

    const review = await prisma.review.create({
      data: {
        businessId: data.businessId,
        userId: session.user.id,
        rating: data.rating,
        title: data.title,
        content: data.content,
        pros: data.pros,
        cons: data.cons,
        aiSentiment,
        aiScore,
        isVerified: true,
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    });

    // Update business rating
    const stats = await prisma.review.aggregate({
      where: { businessId: data.businessId, status: 'APPROVED' },
      _avg: { rating: true },
      _count: true,
    });

    await prisma.business.update({
      where: { id: data.businessId },
      data: {
        avgRating: stats._avg.rating || 0,
        reviewCount: stats._count,
      },
    });

    // Create notification for business owner
    const business = await prisma.business.findUnique({
      where: { id: data.businessId },
      select: { ownerId: true, name: true },
    });

    if (business) {
      await prisma.notification.create({
        data: {
          userId: business.ownerId,
          type: 'review',
          title: 'New Review',
          message: `${session.user.name} left a ${data.rating}-star review on ${business.name}`,
          link: `/dashboard/reviews`,
        },
      });
    }

    return NextResponse.json(review);
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    );
  }
}
