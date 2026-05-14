import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { callOpenRouter, parseAIJson, ChatMessage } from '@/lib/openrouter';

// POST /api/ai/quote-aggregator
// Body: { quoteRequestId?: string; quoteRequestIds?: string[]; serviceDescription?: string }
// Aggregates quotes (real or simulated from candidate businesses) and produces
// a side-by-side comparison + best-fit recommendation.
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const ids: string[] = body.quoteRequestId
      ? [String(body.quoteRequestId)]
      : Array.isArray(body.quoteRequestIds)
      ? body.quoteRequestIds.map(String)
      : [];
    const serviceDescription: string | undefined = body.serviceDescription
      ? String(body.serviceDescription).trim()
      : undefined;

    if (ids.length === 0 && !serviceDescription) {
      return NextResponse.json(
        { error: 'Provide quoteRequestId(s) or serviceDescription' },
        { status: 400 },
      );
    }

    let quotePayload: any[] = [];

    if (ids.length > 0) {
      const requests = await prisma.quoteRequest.findMany({
        where: { id: { in: ids }, userId: session.user.id },
        include: {
          business: {
            select: { id: true, name: true, avgRating: true, reviewCount: true, verified: true, city: true, state: true },
          },
          quote: true,
        },
      });
      quotePayload = requests.map((q) => ({
        quoteRequestId: q.id,
        serviceDescription: q.serviceDescription,
        details: q.details,
        budget: q.budget,
        status: q.status,
        aiEstimate: q.aiEstimate,
        business: q.business,
        receivedQuote: q.quote
          ? { price: q.quote.price, description: q.quote.description, validUntil: q.quote.validUntil }
          : null,
      }));
    } else if (serviceDescription) {
      // Surface comparable candidates to drive a synthetic comparison.
      const candidates = await prisma.business.findMany({
        where: { active: true },
        include: {
          services: { select: { name: true, price: true }, take: 4 },
          categories: { select: { name: true } },
        },
        orderBy: [{ featured: 'desc' }, { avgRating: 'desc' }],
        take: 8,
      });
      quotePayload = candidates.map((b) => ({
        quoteRequestId: null,
        serviceDescription,
        business: {
          id: b.id,
          name: b.name,
          avgRating: b.avgRating,
          reviewCount: b.reviewCount,
          verified: b.verified,
          city: b.city,
          state: b.state,
          categories: b.categories.map((c) => c.name),
          services: b.services,
        },
        receivedQuote: null,
      }));
    }

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content:
          'You aggregate and compare quotes for a local service. Respond with strict JSON: {"summary":"...","comparison":[{"businessId":"","name":"","price_estimate_low":number,"price_estimate_high":number,"value_score":0-100,"strengths":[],"risks":[]}],"best_fit":{"businessId":"","why":""},"price_range":{"low":number,"high":number,"median":number},"red_flags":[],"caveats":[]}. Do not invent businesses; only reference ones provided. If a real quote is present, anchor estimates to it.',
      },
      {
        role: 'user',
        content: `Quotes / candidates:\n${JSON.stringify(quotePayload, null, 2)}`,
      },
    ];

    const ai = await callOpenRouter(messages, { maxTokens: 1400, temperature: 0.3 });
    if (!ai.ok) {
      return NextResponse.json({ error: ai.error }, { status: ai.status });
    }

    const parsed = parseAIJson(ai.content) || { summary: ai.content };
    return NextResponse.json({
      success: true,
      result: parsed,
      model: ai.model,
      input_count: quotePayload.length,
    });
  } catch (error: any) {
    console.error('quote-aggregator error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to aggregate quotes' }, { status: 500 });
  }
}
