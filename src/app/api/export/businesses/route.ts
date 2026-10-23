import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { filterBusinesses, toCsv } from '@/lib/feature-pack';

// Feature pack wave 1A: server-side CSV/JSON export of main records (businesses).
// Client-side exportCsv already exists; this adds the authenticated API export.
const COLUMNS = ['id', 'name', 'city', 'state', 'verified', 'avgRating', 'reviewCount'];

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const rows = await prisma.business.findMany({ where: { active: true }, orderBy: { id: 'desc' }, take: 1000 });
  const plain = rows.map((r) => ({ ...r }) as unknown as Record<string, unknown>);
  const data = filterBusinesses(plain, {
    search: searchParams.get('search') ?? undefined,
    city: searchParams.get('city') ?? undefined,
    verified: searchParams.get('verified') ?? undefined,
  });
  if ((searchParams.get('format') ?? 'csv').toLowerCase() === 'json') {
    return NextResponse.json({ exported_at: new Date().toISOString(), count: data.length, data });
  }
  return new NextResponse(toCsv(data as Record<string, unknown>[], COLUMNS), {
    headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="businesses_export.csv"' },
  });
}
