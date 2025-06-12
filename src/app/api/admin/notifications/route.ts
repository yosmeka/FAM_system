// import { NextResponse } from 'next/server'; // Using Response instead for Next.js 15 compatibility
import { prisma } from '@/lib/prisma';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Fetch the 5 most recent notifications for the current user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ notifications: [] }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  const notifications = await (prisma as any).notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    // No limit - show all notifications
    select: {
      id: true,
      userId: true,
      message: true,
      createdAt: true,
      read: true,
      type: true,
      meta: true // Include meta for document links
    }
  });
  return new Response(JSON.stringify({ notifications }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Mark a notification as read
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing notification id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const notification = await (prisma as any).notification.findUnique({
      where: { id }
    });

    if (!notification || notification.userId !== session.user.id) {
      return new Response(JSON.stringify({ error: 'Not found or forbidden' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const updated = await (prisma as any).notification.update({
      where: { id },
      data: { read: true }
    });

    return new Response(JSON.stringify(updated), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return new Response(JSON.stringify({ error: 'Failed to mark notification as read' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Delete a notification
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing notification id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const notification = await (prisma as any).notification.findUnique({
      where: { id }
    });

    if (!notification || notification.userId !== session.user.id) {
      return new Response(JSON.stringify({ error: 'Not found or forbidden' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await (prisma as any).notification.delete({
      where: { id }
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete notification' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
