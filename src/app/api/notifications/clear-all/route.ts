//import { Response } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// DELETE /api/notifications/clear-all - Delete all notifications for the current user
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Delete all notifications for the current user
    await prisma.notification.deleteMany({
      where: { userId: session.user.id }
    });
    
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    return Response.json(
      { error: 'Failed to clear notifications' },
      { status: 500 }
    );
  }
}
