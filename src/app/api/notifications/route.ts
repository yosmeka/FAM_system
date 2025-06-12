import { NextRequest} from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/notifications - Get notifications for current user
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  });
  return Response.json(notifications);
}

// PATCH /api/notifications - Mark notification as read
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let id;
  try {
    const body = await request.json();
    id = body.id;
  } catch (e) {
    console.error('PATCH /api/notifications: Invalid request body', e);
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }
  if (!id) {
    return Response.json({ error: 'Missing notification id' }, { status: 400 });
  }
  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification || notification.userId !== session.user.id) {
    return Response.json({ error: 'Not found or forbidden' }, { status: 404 });
  }
  const updated = await prisma.notification.update({
    where: { id },
    data: { read: true },
  });
  return Response.json(updated);
}

// DELETE /api/notifications - Delete a notification
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let id;
  try {
    const body = await request.json();
    id = body.id;
  } catch (e) {
    console.error('DELETE /api/notifications: Invalid request body', e);
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }
  if (!id) {
    return Response.json({ error: 'Missing notification id' }, { status: 400 });
  }
  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification || notification.userId !== session.user.id) {
    return Response.json({ error: 'Not found or forbidden' }, { status: 404 });
  }
  await prisma.notification.delete({ where: { id } });
  return Response.json({ success: true });
}
