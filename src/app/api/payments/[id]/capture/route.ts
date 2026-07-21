import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { capturePayment, domainErrorResponse } from '@/lib/field-service/service';

const captureSchema = z.object({ amountCents: z.number().int().positive() });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = captureSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid capture' }, { status: 400 });
  const idempotencyKey = request.headers.get('idempotency-key');
  if (!idempotencyKey) {
    return NextResponse.json({ error: 'Idempotency-Key header is required' }, { status: 400 });
  }
  try {
    const { id } = await params;
    const result = await capturePayment(
      { id: session.user.id, role: session.user.role, businessId: session.user.businessId },
      id,
      parsed.data.amountCents,
      idempotencyKey,
    );
    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    const response = domainErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}

