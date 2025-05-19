import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Fetch the 5 most recent notifications for the current user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ notifications: [] }, { status: 401 });
  }
  const notifications = await prisma.notification.findMany({
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
  return NextResponse.json({ notifications });
}
