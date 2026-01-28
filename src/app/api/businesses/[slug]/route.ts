import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const business = await prisma.business.findUnique({
      where: { slug },
      include: {
        owner: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        categories: true,
        services: {
          where: { active: true },
          include: { category: true },
        },
        photos: { orderBy: { order: 'asc' } },
        videos: true,
        hours: { orderBy: { dayOfWeek: 'asc' } },
        serviceAreas: true,
        reviews: {
          where: { status: 'APPROVED' },
          include: {
            user: { select: { id: true, name: true, avatar: true } },
            photos: true,
            response: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Track view analytics
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.businessAnalytics.upsert({
      where: {
        businessId_date: {
          businessId: business.id,
          date: today,
        },
      },
      update: { views: { increment: 1 } },
      create: {
        businessId: business.id,
        date: today,
        views: 1,
      },
    });

    return NextResponse.json(business);
  } catch (error) {
    console.error('Error fetching business:', error);
    return NextResponse.json(
      { error: 'Failed to fetch business' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { slug } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const business = await prisma.business.findUnique({
      where: { slug },
    });

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    if (business.ownerId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data = await request.json();

    const updatedBusiness = await prisma.business.update({
      where: { slug },
      data: {
        name: data.name,
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
        insured: data.insured,
        categories: data.categoryIds
          ? { set: data.categoryIds.map((id: string) => ({ id })) }
          : undefined,
      },
      include: {
        categories: true,
      },
    });

    return NextResponse.json(updatedBusiness);
  } catch (error) {
    console.error('Error updating business:', error);
    return NextResponse.json(
      { error: 'Failed to update business' },
      { status: 500 }
    );
  }
}
