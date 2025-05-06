import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/server/prisma'; // Ensure this is the correct path and that the generated client includes Permission and RolePermission models.
import { authOptions } from '@/lib/auth';

/**
 * Middleware to protect routes by permission name.
 * Usage: withPermission(handler, 'Asset create')
 */
import { userHasPermission } from "@/lib/server/permissions";

export function withPermission(handler: any, requiredPermission: string) {
  return async (req: NextRequest, ...rest: any[]) => {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;
    const userRole = session.user.role;
    const hasPermission = await userHasPermission(userId, userRole, requiredPermission);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    // User has permission
    return handler(req, ...rest);
  };
}
