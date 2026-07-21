import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { createOpaqueToken, digestToken, publicAppUrl } from '@/lib/security/tokens';

const registrationSchema = z.object({
  email: z.string().email().max(320).transform((email) => email.trim().toLowerCase()),
  password: z.string().min(12).max(128),
  name: z.string().trim().min(2).max(200),
  phone: z.string().trim().max(50).optional(),
  role: z.enum(['CONSUMER', 'BUSINESS_OWNER']).default('CONSUMER'),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = registrationSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid registration', issues: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { email, password, name, phone, role } = parsed.data;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const token = createOpaqueToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { email, password: hashedPassword, name, phone, role },
      });
      await tx.emailVerificationToken.create({
        data: { token: digestToken(token), userId: created.id, expiresAt },
      });
      await tx.outboxEvent.create({
        data: {
          topic: 'auth.verify-email',
          aggregateId: created.id,
          idempotencyKey: `auth.verify-email:${created.id}:${expiresAt.toISOString()}`,
          payload: {
            recipient: created.email,
            name: created.name,
            url: publicAppUrl('/verify-email', token),
          },
        },
      });
      return created;
    });

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      message: 'Account created. Check your email to verify it before signing in.',
    }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register user' },
      { status: 500 }
    );
  }
}
