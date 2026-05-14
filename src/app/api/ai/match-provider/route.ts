import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { callOpenRouter, parseAIJson, ChatMessage } from '@/lib/openrouter';

// POST /api/ai/match-provider
// Body: { needs: string; city?: string; state?: string; budgetMax?: number; categorySlug?: string }
// Returns ranked provider matches + reasoning.
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const needs: string = (body.needs || '').toString().trim();
    if (!needs) {
      return NextResponse.json({ error: 'needs is required' }, { status: 400 });
    }
    const city = body.city ? String(body.city) : undefined;
    const state = body.state ? String(body.state) : undefined;
    const budgetMax = typeof body.budgetMax === 'number' ? body.budgetMax : undefined;
    const categorySlug = body.categorySlug ? String(body.categorySlug) : undefined;

    // Pull a candidate set the AI can rank. Keep query simple/safe.
    const where: any = { active: true };
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (state) where.state = { contains: state, mode: 'insensitive' };
    if (categorySlug) where.categories = { some: { slug: categorySlug } };

    const candidates = await prisma.business.findMany({
      where,
      include: {
        categories: { select: { name: true, slug: true } },
        services: { select: { name: true, price: true }, take: 6 },
      },
      orderBy: [{ featured: 'desc' }, { avgRating: 'desc' }],
      take: 20,
    });

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content:
          'You match consumer service needs to local providers. Respond with strict JSON: {"summary":"...","matches":[{"businessId":"","fit_score":0-100,"why":"","price_signal":"","caveats":[]}],"clarifying_questions":[]}. Only reference providers given to you.',
      },
      {
        role: 'user',
        content: `Need: ${needs}\nLocation: ${city || 'any'}, ${state || 'any'}\nBudget max: ${budgetMax ?? 'unspecified'}\nCategory filter: ${categorySlug || 'none'}\n\nCandidates:\n${JSON.stringify(
          candidates.map((b) => ({
            id: b.id,
            name: b.name,
            avgRating: b.avgRating,
            reviewCount: b.reviewCount,
            verified: b.verified,
            featured: b.featured,
            city: b.city,
            state: b.state,
            categories: b.categories.map((c) => c.name),
            services: b.services,
            shortDescription: b.shortDescription,
          })),
          null,
          2,
        )}`,
      },
    ];

    const ai = await callOpenRouter(messages, { maxTokens: 1200, temperature: 0.3 });
    if (!ai.ok) {
      return NextResponse.json({ error: ai.error }, { status: ai.status });
    }

    const parsed = parseAIJson(ai.content) || { summary: ai.content, matches: [] };
    return NextResponse.json({
      success: true,
      result: parsed,
      model: ai.model,
      candidate_count: candidates.length,
    });
  } catch (error: any) {
    console.error('match-provider error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to match providers' }, { status: 500 });
  }
}
