import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { QuoteStatus } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { assertQuoteTransition, DomainError } from '@/lib/field-service/policy';
import { domainErrorResponse } from '@/lib/field-service/service';

const decisionSchema = z.object({ decision: z.enum(['ACCEPTED', 'REJECTED', 'CANCELLED']) });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = decisionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid decision' }, { status: 400 });
  try {
    const { id } = await params;
    const requestRecord = await prisma.quoteRequest.findUnique({
      where: { id },
      include: { quote: true },
    });
    if (!requestRecord) throw new DomainError('QUOTE_NOT_FOUND', 'Quote request not found', 404);
    if (requestRecord.userId !== session.user.id && session.user.role !== 'ADMIN') {
      throw new DomainError('FORBIDDEN', 'Only the customer can decide this quote', 403);
    }
    if (
      parsed.data.decision === 'ACCEPTED' &&
      (!requestRecord.quote || requestRecord.quote.validUntil < new Date())
    ) {
      if (requestRecord.status === QuoteStatus.SENT) {
        await prisma.quoteRequest.update({ where: { id }, data: { status: QuoteStatus.EXPIRED } });
      }
      throw new DomainError('QUOTE_EXPIRED', 'Quote has expired');
    }
    assertQuoteTransition(requestRecord.status, parsed.data.decision);
    const updated = await prisma.$transaction(async (tx) => {
      const quoteRequest = await tx.quoteRequest.update({
        where: { id },
        data: { status: parsed.data.decision },
        include: { quote: true },
      });
      if (parsed.data.decision === 'ACCEPTED' && quoteRequest.quote) {
        await tx.quote.update({
          where: { id: quoteRequest.quote.id },
          data: { acceptedAt: new Date() },
        });
      }
      await tx.outboxEvent.create({
        data: {
          topic: `quote.${parsed.data.decision.toLowerCase()}`,
          aggregateId: id,
          idempotencyKey: `quote.${parsed.data.decision.toLowerCase()}:${id}`,
          payload: { quoteRequestId: id },
        },
      });
      return quoteRequest;
    });
    return NextResponse.json(updated);
  } catch (error) {
    const response = domainErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}

