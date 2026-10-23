import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateTask } from '@/lib/feature-pack';
import { listTasks, createTask } from '@/lib/feature-pack-tasks';

// Feature pack wave 1A: authenticated tasks list/create.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as { id?: string }).id ?? session.user.email ?? 'unknown';
  return NextResponse.json({ data: listTasks(userId) });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const data = validateTask(body ?? {});
    const userId = (session.user as { id?: string }).id ?? session.user.email ?? 'unknown';
    return NextResponse.json(createTask({ ...data, createdBy: userId }), { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Invalid task';
    return NextResponse.json({ error: msg }, { status: msg === 'title is required' ? 400 : 500 });
  }
}
