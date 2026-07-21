import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { createOpaqueToken, digestToken, publicAppUrl } from '@/lib/security/tokens';

const forgotPasswordSchema = z.object({
  email: z.string().email().max(320).transform((email) => email.trim().toLowerCase()),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = forgotPasswordSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    const { email } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Return success even if user not found to prevent email enumeration
      return NextResponse.json({
        message: 'If an account exists with that email, a reset token has been generated.',
      });
    }

    const token = createOpaqueToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.updateMany({
        where: { userId: user.id, used: false },
        data: { used: true },
      });
      await tx.passwordResetToken.create({
        data: { token: digestToken(token), userId: user.id, expiresAt },
      });
      await tx.outboxEvent.create({
        data: {
          topic: 'auth.reset-password',
          aggregateId: user.id,
          idempotencyKey: `auth.reset-password:${user.id}:${expiresAt.toISOString()}`,
          payload: {
            recipient: user.email,
            name: user.name,
            url: publicAppUrl('/reset-password', token),
          },
        },
      });
    });
    return NextResponse.json({
      message: 'If an account exists with that email, a reset link has been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
