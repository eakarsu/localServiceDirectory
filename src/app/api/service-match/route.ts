// AI service-match assistant (describe a job, get vetted matches + quotes).
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { callOpenRouter } from '@/lib/openrouter';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { jobDescription, location, budgetCents } = await req.json();
    if (!jobDescription) return NextResponse.json({ error: 'jobDescription required' }, { status: 400 });

    const businesses: any[] = await prisma.business.findMany({ take: 200 }).catch(() => []);

    const result = await callOpenRouter([
      {
        role: 'system',
        content: 'You match a job description to providers. Return JSON {"matches":[{"businessId":string,"score":0-100,"reasoning":string}]}'
      },
      {
        role: 'user',
        content: `Job: ${jobDescription}\nLocation: ${location || 'unspecified'}\nBudget: ${budgetCents || 'n/a'}\nProviders: ${JSON.stringify(businesses.slice(0, 30).map((b: any) => ({ id: b.id, name: b.name, category: b.category, location: b.location })))}`
      }
    ], { maxTokens: 800 });

    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    let parsed: any;
    try { parsed = JSON.parse(result.content.match(/\{[\s\S]*\}/)![0]); } catch { parsed = { raw: result.content }; }
    return NextResponse.json(parsed);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
