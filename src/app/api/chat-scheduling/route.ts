// Real-time chat + scheduling negotiation agent.
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { callOpenRouter } from '@/lib/openrouter';

type Session = { id: string; transcript: { role: 'user' | 'assistant'; text: string }[]; proposedSlot?: string };
const sessions = new Map<string, Session>();

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const { action } = body;

  if (action === 'start') {
    const id = `cs_${Date.now()}`;
    sessions.set(id, { id, transcript: [] });
    return NextResponse.json({ sessionId: id });
  }

  if (action === 'message') {
    const s = sessions.get(body.sessionId);
    if (!s) return NextResponse.json({ error: 'session not found' }, { status: 404 });
    s.transcript.push({ role: 'user', text: body.text });
    const result = await callOpenRouter([
      { role: 'system', content: 'You negotiate scheduling between a customer and a service provider. Propose 2 specific time slots when asked. Reply concisely.' },
      ...s.transcript.slice(-6).map(t => ({ role: t.role, content: t.text }))
    ], { maxTokens: 300 });
    const reply = result.ok ? result.content : 'AI unavailable; please try again.';
    s.transcript.push({ role: 'assistant', text: reply });
    return NextResponse.json({ reply, transcriptLen: s.transcript.length });
  }

  if (action === 'commit-slot') {
    const s = sessions.get(body.sessionId);
    if (!s) return NextResponse.json({ error: 'session not found' }, { status: 404 });
    s.proposedSlot = body.slot;
    return NextResponse.json({ ok: true, slot: body.slot });
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sid = req.nextUrl.searchParams.get('sessionId');
  if (!sid) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
  const s = sessions.get(sid);
  if (!s) return NextResponse.json({ error: 'session not found' }, { status: 404 });
  return NextResponse.json(s);
}
