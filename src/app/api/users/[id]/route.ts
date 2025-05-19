import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

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
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id: string; role: string };

  if (!user || !(await hasPermission({ id: user.id, role: user.role }, 'User edit/update'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, email, role } = body;
    // Fetch current user to check for role change
    const existingUser = await prisma.user.findUnique({ where: { id: params.id } });
    let updatedUser;
    if (existingUser) {
      updatedUser = await prisma.user.update({
        where: { id: params.id },
        data: { name, email, role },
      });
      // If role actually changed, create RoleChangeLog
      if (role && existingUser.role !== role) {
        await prisma.roleChangeLog.create({
          data: {
            userId: params.id,
            oldRole: existingUser.role,
            newRole: role,
            changedBy: user.id,
          },
        });
      }
    } else {
      updatedUser = null;
    }
    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id: string; role: string };
  if (!user || !(await hasPermission({ id: user.id, role: user.role }, 'User delete'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  try {
    await prisma.user.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
