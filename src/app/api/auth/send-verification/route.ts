import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createOpaqueToken, digestToken, publicAppUrl } from '@/lib/security/tokens';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ error: 'Email already verified' }, { status: 400 });
    }

    const token = createOpaqueToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await prisma.$transaction(async (tx) => {
      await tx.emailVerificationToken.updateMany({
        where: { userId: user.id, used: false },
        data: { used: true },
      });
      await tx.emailVerificationToken.create({
        data: { token: digestToken(token), userId: user.id, expiresAt },
      });
      await tx.outboxEvent.create({
        data: {
          topic: 'auth.verify-email',
          aggregateId: user.id,
          idempotencyKey: `auth.verify-email:${user.id}:${expiresAt.toISOString()}`,
          payload: {
            recipient: user.email,
            name: user.name,
            url: publicAppUrl('/verify-email', token),
          },
        },
      });
    });
    return NextResponse.json({
      message: 'Verification email sent.',
    });
  } catch (error) {
    console.error('Send verification error:', error);
    return NextResponse.json({ error: 'Failed to send verification' }, { status: 500 });
  }
}
