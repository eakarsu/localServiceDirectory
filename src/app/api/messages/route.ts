import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationWith = searchParams.get('with');

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: session.user.id },
          { receiverId: session.user.id },
        ],
        ...(conversationWith ? {
          OR: [
            { senderId: conversationWith },
            { receiverId: conversationWith },
          ],
        } : {}),
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
        receiver: { select: { id: true, name: true, avatar: true } },
        business: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
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

    const { receiverId, businessId, subject, content } = await request.json();

    const message = await prisma.message.create({
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

    // Create notification
    await prisma.notification.create({
      data: {
        userId: receiverId,
        type: 'message',
        title: 'New Message',
        message: `${session.user.name} sent you a message`,
        link: '/dashboard/messages',
      },
    });

    return NextResponse.json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
