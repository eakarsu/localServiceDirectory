import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { authorizeInvoicePayment, domainErrorResponse } from '@/lib/field-service/service';

const paymentSchema = z.object({ amountCents: z.number().int().positive() });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = paymentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'A positive amountCents is required' }, { status: 400 });
  }
  const idempotencyKey = request.headers.get('idempotency-key');
  if (!idempotencyKey) {
    return NextResponse.json({ error: 'Idempotency-Key header is required' }, { status: 400 });
  }
  try {
    const { id } = await params;
    const payment = await authorizeInvoicePayment(
      { id: session.user.id, role: session.user.role, businessId: session.user.businessId },
      id,
      parsed.data.amountCents,
      idempotencyKey,
    );
    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    const response = domainErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}

