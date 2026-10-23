import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateTask } from '@/lib/feature-pack-tasks';

// Feature pack wave 1A: authenticated task update.
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  for (const k of ['title', 'status', 'assignee', 'businessId', 'dueDate', 'notes']) {
    if (body[k] !== undefined) patch[k] = body[k];
  }
  const userId = (session.user as { id?: string }).id ?? session.user.email ?? 'unknown';
  const updated = updateTask(id, patch as never, userId);
  if (!updated) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  return NextResponse.json(updated);
}
