import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

const messageQuerySchema = z.object({
  with: z.string().min(1).max(191).optional(),
});

const sendMessageSchema = z.object({
  receiverId: z.string().min(1).max(191),
  businessId: z.string().min(1).max(191).optional(),
  subject: z.string().trim().max(200).optional(),
  content: z.string().trim().min(1).max(10_000),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const query = messageQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!query.success) {
      return NextResponse.json({ error: 'Invalid query' }, { status: 400 });
    }
    const conversationWith = query.data.with;

    const participantFilter = conversationWith
      ? {
          OR: [
            { senderId: session.user.id, receiverId: conversationWith },
            { senderId: conversationWith, receiverId: session.user.id },
          ],
        }
      : {
          OR: [
            { senderId: session.user.id },
            { receiverId: session.user.id },
          ],
        };

    const messages = await prisma.message.findMany({
      where: participantFilter,
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
        receiver: { select: { id: true, name: true, avatar: true } },
        business: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    // Group messages by conversation
    const conversations = new Map();
    messages.forEach((message) => {
      const otherUserId = message.senderId === session.user.id ? message.receiverId : message.senderId;
      if (!conversations.has(otherUserId)) {
        conversations.set(otherUserId, {
          userId: otherUserId,
          user: message.senderId === session.user.id ? message.receiver : message.sender,
          lastMessage: message,
          unreadCount: 0,
        });
      }
      if (!message.read && message.receiverId === session.user.id) {
        const conv = conversations.get(otherUserId);
        conv.unreadCount++;
      }
    });

    return NextResponse.json({
      messages,
      conversations: Array.from(conversations.values()),
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = sendMessageSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid message', issues: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { receiverId, businessId, subject, content } = parsed.data;
    if (receiverId === session.user.id) {
      return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 });
    }

    const message = await prisma.$transaction(async (tx) => {
      const receiver = await tx.user.findUnique({
        where: { id: receiverId },
        select: { id: true },
      });
      if (!receiver) throw new Error('RECEIVER_NOT_FOUND');

      if (businessId) {
        const business = await tx.business.findUnique({
          where: { id: businessId },
          select: { ownerId: true },
        });
        if (
          !business ||
          (business.ownerId !== session.user.id && business.ownerId !== receiverId)
        ) {
          throw new Error('BUSINESS_NOT_ALLOWED');
        }
      }

      const created = await tx.message.create({
        data: {
          senderId: session.user.id,
          receiverId,
          businessId,
          subject,
          content,
        },
        include: {
          sender: { select: { id: true, name: true, avatar: true } },
          receiver: { select: { id: true, name: true, avatar: true } },
        },
      });

      await tx.notification.create({
        data: {
          userId: receiverId,
          type: 'message',
          title: 'New Message',
          message: `${session.user.name || 'A customer'} sent you a message`,
          link: '/dashboard/messages',
        },
      });
      return created;
    });

    return NextResponse.json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    if (error instanceof Error && error.message === 'RECEIVER_NOT_FOUND') {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
    }
    if (error instanceof Error && error.message === 'BUSINESS_NOT_ALLOWED') {
      return NextResponse.json({ error: 'Business context is not allowed' }, { status: 403 });
    }
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
