import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Fetch last 10 user, permission, and role changes
export async function GET() {
  try {
    // Fetch recent user updates (all activity)
    const users = await prisma.user.findMany({
      orderBy: { updatedAt: 'desc' },
      select: { id: true, name: true, email: true, role: true, updatedAt: true, createdAt: true }
    });
    // Fetch recent permission updates
    const permissions = await prisma.permission.findMany({
      orderBy: { updatedAt: 'desc' },
      select: { id: true, name: true, description: true, updatedAt: true, createdAt: true }
    });
    // Fetch true role change logs (audit)
    const roleChanges = await prisma.roleChangeLog.findMany({
      orderBy: { changedAt: 'desc' },
      take: 5,
      include: {
        user: { select: { id: true, name: true, email: true } },
        changedByUser: { select: { id: true, name: true, email: true } },
      },
    });
    return NextResponse.json({ users: users || [], permissions: permissions || [], roleChanges: roleChanges || [] });
  } catch (error) {
    return NextResponse.json({ users: [], permissions: [], roleChanges: [] });
  }
}
// TODO: For a real audit log of role changes, create a RoleChangeLog table and update this endpoint.
