// Review authenticity AI with shadow-ban on fraud rings.
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { callOpenRouter } from '@/lib/openrouter';

type Flag = { reviewId: string; verdict: any; flaggedAt: Date };
const flags: Flag[] = [];
const shadowBanned = new Set<string>();

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { action, reviewId, userId } = await req.json();

    if (action === 'analyze') {
      if (!reviewId) return NextResponse.json({ error: 'reviewId required' }, { status: 400 });
      const review: any = await prisma.review.findUnique({ where: { id: reviewId } }).catch(() => null);
      if (!review) return NextResponse.json({ error: 'review not found' }, { status: 404 });

      const r = await callOpenRouter([
        { role: 'system', content: 'Score review authenticity. Return JSON {"authenticity":0-1,"signals":[string],"likely_fake":bool,"reason":string}.' },
        { role: 'user', content: JSON.stringify({ rating: review.rating, content: review.content, userId: review.userId }).slice(0, 2000) }
      ], { maxTokens: 300 });

      if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
      let verdict: any;
      try { verdict = JSON.parse(r.content.match(/\{[\s\S]*\}/)![0]); } catch { verdict = { raw: r.content }; }
      flags.push({ reviewId, verdict, flaggedAt: new Date() });
      return NextResponse.json(verdict);
    }

    if (action === 'shadow-ban') {
      if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
      shadowBanned.add(userId);
      return NextResponse.json({ ok: true, banned: [...shadowBanned] });
    }

    if (action === 'fraud-ring-detect') {
      // Simple fraud-ring heuristic: users who review the same business within 60min of each other.
      const reviews: any[] = await prisma.review.findMany({ take: 1000, orderBy: { createdAt: 'desc' } }).catch(() => []);
      const ringsByBusiness: Record<string, any[]> = {};
      for (const r of reviews) {
        (ringsByBusiness[r.businessId] = ringsByBusiness[r.businessId] || []).push(r);
      }
      const rings: any[] = [];
      for (const [bid, arr] of Object.entries(ringsByBusiness)) {
        arr.sort((a: any, b: any) => +new Date(a.createdAt) - +new Date(b.createdAt));
        for (let i = 1; i < arr.length; i++) {
          const dt = (+new Date(arr[i].createdAt) - +new Date(arr[i - 1].createdAt)) / 60000;
          if (dt < 60 && arr[i].userId !== arr[i - 1].userId) {
            rings.push({ businessId: bid, suspects: [arr[i - 1].userId, arr[i].userId], gapMin: dt });
          }
        }
      }
      return NextResponse.json({ rings });
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ flagCount: flags.length, recent: flags.slice(-50), shadowBanned: [...shadowBanned] });
}
