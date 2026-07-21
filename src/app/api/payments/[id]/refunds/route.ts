import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { domainErrorResponse, refundPayment } from '@/lib/field-service/service';

const refundSchema = z.object({
  amountCents: z.number().int().positive(),
  reason: z.string().max(500).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = refundSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid refund' }, { status: 400 });
  const idempotencyKey = request.headers.get('idempotency-key');
  if (!idempotencyKey) {
    return NextResponse.json({ error: 'Idempotency-Key header is required' }, { status: 400 });
  }
  try {
    const { id } = await params;
    const refund = await refundPayment(
      { id: session.user.id, role: session.user.role, businessId: session.user.businessId },
      id,
      parsed.data.amountCents,
      parsed.data.reason,
      idempotencyKey,
    );
    return NextResponse.json(refund, { status: 202 });
  } catch (error) {
    const response = domainErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}

