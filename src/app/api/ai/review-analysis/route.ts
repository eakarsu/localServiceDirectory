import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { callOpenRouter, parseAIJson, ChatMessage } from '@/lib/openrouter';

// POST /api/ai/review-analysis
// Body: { businessId?: string; reviewIds?: string[]; lookbackDays?: number }
// Returns sentiment summary, theme clusters, spam candidates, response priorities.
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const businessId: string | undefined = body.businessId ? String(body.businessId) : undefined;
    const reviewIds: string[] = Array.isArray(body.reviewIds) ? body.reviewIds.map(String) : [];
    const lookbackDays = Math.min(Math.max(parseInt(body.lookbackDays) || 90, 1), 365);

    if (!businessId && reviewIds.length === 0) {
      return NextResponse.json(
        { error: 'Provide businessId or reviewIds' },
        { status: 400 },
      );
    }

    const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);
    const where: any = {};
    if (businessId) {
      where.businessId = businessId;
      where.createdAt = { gte: since };
    }
    if (reviewIds.length > 0) {
      where.id = { in: reviewIds };
    }

    const reviews = await prisma.review.findMany({
      where,
      select: {
        id: true,
        rating: true,
        title: true,
        content: true,
        createdAt: true,
        status: true,
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    if (reviews.length === 0) {
      return NextResponse.json({
        success: true,
        result: { summary: 'No reviews in window', sentiment: null, themes: [], spam_candidates: [], response_priorities: [] },
        model: null,
        review_count: 0,
      });
    }

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content:
          'You analyze customer reviews for a local service business. Respond with strict JSON: {"summary":"...","sentiment":{"positive_pct":0-100,"neutral_pct":0-100,"negative_pct":0-100,"avg_rating":number},"themes":[{"theme":"","example_review_ids":[],"sentiment":"positive|neutral|negative"}],"spam_candidates":[{"review_id":"","reason":""}],"response_priorities":[{"review_id":"","why":"","tone":""}]}',
      },
      {
        role: 'user',
        content: `Reviews to analyze (lookback ${lookbackDays}d):\n${JSON.stringify(
          reviews.map((r) => ({
            id: r.id,
            rating: r.rating,
            title: r.title,
            content: r.content,
            author: r.user?.name,
            status: r.status,
            createdAt: r.createdAt,
          })),
          null,
          2,
        )}`,
      },
    ];

    const ai = await callOpenRouter(messages, { maxTokens: 1500, temperature: 0.3 });
    if (!ai.ok) {
      return NextResponse.json({ error: ai.error }, { status: ai.status });
    }

    const parsed = parseAIJson(ai.content) || { summary: ai.content };
    return NextResponse.json({
      success: true,
      result: parsed,
      model: ai.model,
      review_count: reviews.length,
    });
  } catch (error: any) {
    console.error('review-analysis error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to analyze reviews' }, { status: 500 });
  }
}
