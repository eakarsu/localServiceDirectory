import { NextRequest, NextResponse } from 'next/server';
import { processOutboxBatch } from '@/lib/field-service/outbox';

export async function POST(request: NextRequest) {
  const secret = process.env.INTERNAL_JOB_SECRET;
  const authorization = request.headers.get('authorization');
  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const requested = Number(request.nextUrl.searchParams.get('limit') ?? '25');
  const results = await processOutboxBatch(Number.isInteger(requested) ? requested : 25);
  return NextResponse.json({ processed: results.length, results });
}

