import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// Permission check helper
async function hasPermission(user: { role: string }, permissionName: string): Promise<boolean> {
  if (user.role === 'ADMIN') return true;
  const permission = await prisma.permission.findUnique({ where: { name: permissionName } });
  if (!permission) return false;
  const rolePermission = await prisma.rolePermission.findFirst({
    where: { role: user.role, permissionId: permission.id },
  });
  return !!rolePermission;
}

// PUT /api/users/[id] -- update user info
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role: string };

  if (!user || !(await hasPermission(user, 'User edit/update'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, email, role } = body;
    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: { name, email, role },
    });
    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role: string };
  if (!user || !(await hasPermission(user, 'User delete'))) {
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
