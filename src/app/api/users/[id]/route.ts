import { NextRequest } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Permission check helper
// Permission check helper
export async function hasPermission(user: { id: string, role: string }, permissionName: string): Promise<boolean> {
  // ADMIN can only access user and role/permission management endpoints
  if (user.role === 'ADMIN') {
    if (permissionName.startsWith('User ') || permissionName.startsWith('Role ') || permissionName.startsWith('Permission ')) {
      return true;
    }
    return false;
  }
  const permission = await prisma.permission.findUnique({ where: { name: permissionName } });
  if (!permission) return false;

  // Check for user-specific override first
  const userPermission = await prisma.userPermission.findUnique({
    where: { userId_permissionId: { userId: user.id, permissionId: permission.id } }
  });
  if (userPermission) {
    return userPermission.granted;
  }

  // Fallback to role-based permission
  const rolePermission = await prisma.rolePermission.findFirst({
    where: { role: user.role, permissionId: permission.id },
  });
  return !!rolePermission;
}

// PUT /api/users/[id] -- update user info
export async function PUT(request: NextRequest, { params: { id } }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id: string; role: string };

  if (!user || !(await hasPermission({ id: user.id, role: user.role }, 'User edit/update'))) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, email, role } = body;
    // Fetch current user to check for role change
    const existingUser = await prisma.user.findUnique({ where: { id } });
    let updatedUser;
    if (existingUser) {
      updatedUser = await prisma.user.update({
        where: { id },
        data: { name, email, role },
      });
      // If role actually changed, create RoleChangeLog
      if (role && existingUser.role !== role) {
        await prisma.roleChangeLog.create({
          data: {
            userId: id,
            oldRole: existingUser.role,
            newRole: role,
            changedBy: user.id,
          },
        });
      }
    } else {
      updatedUser = null;
    }
    return Response.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return Response.json({ error: 'Internal Server Error', details: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params: { id } }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id: string; role: string };
  if (!user || !(await hasPermission({ id: user.id, role: user.role }, 'User delete'))) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }
  try {
    // First delete notifications associated with the user
    await prisma.notification.deleteMany({ where: { userId: id } });
    
    // Then delete the user
    await prisma.user.delete({ where: { id } });
    return Response.json({ success: true });
  } catch (error: unknown) {
    console.error('Error deleting user:', error);
    // Check if it's a Prisma known request error for foreign key constraints
    // and if error is an object with a 'code' property
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2003') {
      return Response.json({ error: 'Cannot delete user. They are referenced in other records (e.g., logs, assignments). Please reassign or remove these references first.' }, { status: 409 }); // 409 Conflict
    }
    // Check if error is an object with a 'message' property
    const details = (typeof error === 'object' && error !== null && 'message' in error) ? String(error.message) : String(error);
    return Response.json({ error: 'Internal Server Error', details }, { status: 500 });
  }
}
