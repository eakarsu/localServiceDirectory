import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { buildFallback, hasAiKey, renderAiSections } from '@/lib/feature-pack';

// Feature pack wave 1A: domain AI over the directory's own business records.
// Real provider call only when a key is configured; otherwise a clearly
// labelled deterministic fallback — never a fake AI success.
const FEATURES = ['business-recommendation', 'listing-quality-check', 'review-summary'];

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const feature = String(body.feature ?? 'business-recommendation');
  if (!FEATURES.includes(feature)) {
    return NextResponse.json({ error: `Unknown feature. Use: ${FEATURES.join(', ')}` }, { status: 400 });
  }
  const rows = await prisma.business.findMany({ where: { active: true }, orderBy: { id: 'desc' }, take: 200 });
  const plain = rows.map((r) => ({ ...r }) as unknown as Record<string, unknown>);

  if (!hasAiKey()) {
    const result = buildFallback(feature, plain);
    return NextResponse.json({ ...result, sections: renderAiSections(result as unknown as Record<string, unknown>) });
  }

  const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
  const isOpenRouter = Boolean(process.env.OPENROUTER_API_KEY);
  const url = isOpenRouter ? 'https://openrouter.ai/api/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions';
  const model = process.env.OPENROUTER_MODEL || process.env.OPENAI_MODEL || (isOpenRouter ? 'anthropic/claude-3-5-sonnet-20241022' : 'gpt-4o-mini');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: `Feature: ${feature}. Business records (JSON): ${JSON.stringify(plain.slice(0, 50))}. Respond with a concise labelled summary.` }],
      max_tokens: 1200,
    }),
  });
  if (!res.ok) return NextResponse.json({ error: `Provider error (${res.status})` }, { status: 502 });
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? '';
  const result = { source: 'provider', aiGenerated: true, feature, text };
  return NextResponse.json({ ...result, sections: renderAiSections(result) });
}
