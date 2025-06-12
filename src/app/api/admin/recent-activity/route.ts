// import { NextResponse } from 'next/server'; // Using Response instead for Next.js 15 compatibility
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
    return new Response(JSON.stringify({ users: users || [], permissions: permissions || [], roleChanges: roleChanges || [] }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ users: [], permissions: [], roleChanges: [] }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
// TODO: For a real audit log of role changes, create a RoleChangeLog table and update this endpoint.
