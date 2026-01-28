import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const city = searchParams.get('city');
    const featured = searchParams.get('featured');
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    const where: any = { active: true };

    if (category) {
      where.categories = { some: { slug: category } };
    }

    if (city) {
      where.city = { contains: city, mode: 'insensitive' };
    }

    if (featured === 'true') {
      where.featured = true;
    }

    const [businesses, total] = await Promise.all([
      prisma.business.findMany({
        where,
        include: {
          categories: true,
          photos: { where: { isPrimary: true }, take: 1 },
          serviceAreas: { take: 5 },
        },
        orderBy: [{ featured: 'desc' }, { avgRating: 'desc' }],
        take: limit,
        skip,
      }),
      prisma.business.count({ where }),
    ]);

    return NextResponse.json({
      businesses,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching businesses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch businesses' },
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

    if (session.user.role !== 'BUSINESS_OWNER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data = await request.json();

    // Check if user already has a business
    const existingBusiness = await prisma.business.findUnique({
      where: { ownerId: session.user.id },
    });

    if (existingBusiness) {
      return NextResponse.json(
        { error: 'User already has a business' },
        { status: 400 }
      );
    }

    // Generate slug
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const business = await prisma.business.create({
      data: {
        ownerId: session.user.id,
        name: data.name,
        slug,
        description: data.description,
        shortDescription: data.shortDescription,
        phone: data.phone,
        email: data.email,
        website: data.website,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        latitude: data.latitude,
        longitude: data.longitude,
        serviceRadius: data.serviceRadius,
        priceRange: data.priceRange,
        yearEstablished: data.yearEstablished,
        licenseNumber: data.licenseNumber,
        insured: data.insured || false,
        categories: data.categoryIds
          ? { connect: data.categoryIds.map((id: string) => ({ id })) }
          : undefined,
      },
      include: {
        categories: true,
      },
    });

    return NextResponse.json(business);
  } catch (error) {
    console.error('Error creating business:', error);
    return NextResponse.json(
      { error: 'Failed to create business' },
      { status: 500 }
    );
  }
}
