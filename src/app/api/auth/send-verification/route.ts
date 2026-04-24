import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

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

    // Invalidate existing tokens
    await prisma.emailVerificationToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.emailVerificationToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    // In production, send email with verification link
    return NextResponse.json({
      message: 'Verification email sent.',
      token, // Remove in production - only for demo
    });
  } catch (error) {
    console.error('Send verification error:', error);
    return NextResponse.json({ error: 'Failed to send verification' }, { status: 500 });
  }
}
