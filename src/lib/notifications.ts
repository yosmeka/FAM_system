import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// Enhanced: sendNotification supports type, metadata, and custom messages
export async function sendNotification({
  userId,
  message,
  type = 'info',
  meta = null,
}: {
  userId: string;
  message: string;
  type?: string;
  meta?: Record<string, unknown> | null;
}) {
  return prisma.notification.create({
    data: {
      userId,
      message,
      type,
      meta: meta === null ? undefined : (meta as Prisma.InputJsonValue), 
    },
  });
}

export async function getUserNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function markNotificationRead(notificationId: string) {
  return prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });
}
