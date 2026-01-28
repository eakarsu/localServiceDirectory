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
    const days = parseInt(searchParams.get('days') || '30');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const businessId = session.user.businessId;

    if (!businessId) {
      return NextResponse.json({ error: 'No business found' }, { status: 404 });
    }

    // Get daily analytics
    const dailyAnalytics = await prisma.businessAnalytics.findMany({
      where: {
        businessId,
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
    });

    // Calculate totals
    const totals = dailyAnalytics.reduce(
      (acc, day) => ({
        views: acc.views + day.views,
        searches: acc.searches + day.searches,
        clicks: acc.clicks + day.clicks,
        calls: acc.calls + day.calls,
        bookings: acc.bookings + day.bookings,
        quoteRequests: acc.quoteRequests + day.quoteRequests,
      }),
      { views: 0, searches: 0, clicks: 0, calls: 0, bookings: 0, quoteRequests: 0 }
    );

    // Get business stats
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { avgRating: true, reviewCount: true },
    });

    // Get recent leads count
    const recentLeads = await prisma.lead.count({
      where: {
        businessId,
        createdAt: { gte: startDate },
      },
    });

    // Get pending bookings
    const pendingBookings = await prisma.booking.count({
      where: {
        businessId,
        status: 'PENDING',
      },
    });

    // Get recent reviews
    const recentReviews = await prisma.review.count({
      where: {
        businessId,
        createdAt: { gte: startDate },
      },
    });

    return NextResponse.json({
      daily: dailyAnalytics.map((d) => ({
        date: d.date.toISOString().split('T')[0],
        views: d.views,
        clicks: d.clicks,
        bookings: d.bookings,
        calls: d.calls,
      })),
      totals,
      stats: {
        avgRating: business?.avgRating || 0,
        reviewCount: business?.reviewCount || 0,
        recentLeads,
        pendingBookings,
        recentReviews,
      },
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
