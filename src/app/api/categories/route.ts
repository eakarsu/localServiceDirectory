import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parent = searchParams.get('parent');
    const withCount = searchParams.get('withCount') === 'true';

    const where: any = {};

    if (parent === 'null' || parent === '') {
      where.parentId = null;
    } else if (parent) {
      where.parentId = parent;
    }

    const categories = await prisma.category.findMany({
      where,
      include: {
        children: true,
        parent: true,
        _count: withCount ? { select: { businesses: true } } : undefined,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}
