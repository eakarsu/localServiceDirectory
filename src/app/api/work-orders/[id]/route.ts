import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { domainErrorResponse, getWorkOrderForActor } from '@/lib/field-service/service';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    const workOrder = await getWorkOrderForActor(
      {
        id: session.user.id,
        role: session.user.role,
        businessId: session.user.businessId,
      },
      id,
    );
    return NextResponse.json(workOrder);
  } catch (error) {
    const response = domainErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}

