import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const category = searchParams.get('category');
    const city = searchParams.get('city');
    const state = searchParams.get('state');
    const minRating = parseFloat(searchParams.get('minRating') || '0');
    const priceRange = searchParams.get('priceRange')?.split(',').map(Number);
    const verified = searchParams.get('verified') === 'true';
    const sortBy = searchParams.get('sortBy') || 'rating';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: any = { active: true };

    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { services: { some: { name: { contains: query, mode: 'insensitive' } } } },
        { categories: { some: { name: { contains: query, mode: 'insensitive' } } } },
      ];
    }

    if (category) {
      where.categories = { some: { slug: category } };
    }

    if (city) {
      where.OR = [
        { city: { contains: city, mode: 'insensitive' } },
        { serviceAreas: { some: { city: { contains: city, mode: 'insensitive' } } } },
      ];
    }

    if (state) {
      where.state = state;
    }

    if (minRating > 0) {
      where.avgRating = { gte: minRating };
    }

    if (priceRange && priceRange.length === 2) {
      where.priceRange = { gte: priceRange[0], lte: priceRange[1] };
    }

    if (verified) {
      where.verified = true;
    }

    let orderBy: any = { avgRating: 'desc' };
    switch (sortBy) {
      case 'reviews':
        orderBy = { reviewCount: 'desc' };
        break;
      case 'name':
        orderBy = { name: 'asc' };
        break;
      case 'newest':
        orderBy = { createdAt: 'desc' };
        break;
    }

    const [businesses, total] = await Promise.all([
      prisma.business.findMany({
        where,
        include: {
          categories: true,
          photos: { where: { isPrimary: true }, take: 1 },
          services: { take: 3 },
          serviceAreas: { take: 3 },
        },
        orderBy: [{ featured: 'desc' }, orderBy],
        take: limit,
        skip,
      }),
      prisma.business.count({ where }),
    ]);

    // Track search analytics
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const business of businesses) {
      await prisma.businessAnalytics.upsert({
        where: {
          businessId_date: {
            businessId: business.id,
            date: today,
          },
        },
        update: { searches: { increment: 1 } },
        create: {
          businessId: business.id,
          date: today,
          searches: 1,
        },
      }).catch(() => {});
    }

    return NextResponse.json({
      businesses,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      query,
      filters: { category, city, state, minRating, priceRange, verified },
    });
  } catch (error) {
    console.error('Error searching businesses:', error);
    return NextResponse.json(
      { error: 'Failed to search businesses' },
      { status: 500 }
    );
  }
}
