import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';


// GET: List all permissions for a user (explicit + effective)
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = params.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { userPermissions: { include: { permission: true } } }
  });
  console.log('Requested userId:', userId, 'User:', user);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (!user.role) {
    console.error('User found but has no role:', user);
    return NextResponse.json({ error: 'User found but has no role assigned.' }, { status: 500 });
  }

  // Get all permissions
  const allPermissions = await prisma.permission.findMany();
  // Get all role-permissions for the user's role
  const rolePerms = await prisma.rolePermission.findMany({ where: { role: user.role } });
  const rolePermissionIds = new Set(rolePerms.map(rp => rp.permissionId));

  // Build effective permissions
  const effective: Record<string, boolean> = {};
  for (const perm of allPermissions) {
    const userOverride = user.userPermissions.find(up => up.permissionId === perm.id);
    if (userOverride) {
      effective[perm.name] = userOverride.granted;
    } else {
      effective[perm.name] = rolePermissionIds.has(perm.id);
    }
  }

  return NextResponse.json({
    userPermissions: user.userPermissions,
    effectivePermissions: effective,
  });
}

// POST: Grant or revoke a specific permission for a user
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = params.id;
  const { permissionName, granted } = await request.json();
  const permission = await prisma.permission.findUnique({ where: { name: permissionName } });
  if (!permission) return NextResponse.json({ error: 'Permission not found' }, { status: 404 });
  // Upsert user permission
  const userPerm = await prisma.userPermission.upsert({
    where: { userId_permissionId: { userId, permissionId: permission.id } },
    update: { granted },
    create: { userId, permissionId: permission.id, granted },
  });
  return NextResponse.json(userPerm);
}

// DELETE: Remove a user-specific permission override (revert to role-based)
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = params.id;
  const { permissionName } = await request.json();
  const permission = await prisma.permission.findUnique({ where: { name: permissionName } });
  if (!permission) return NextResponse.json({ error: 'Permission not found' }, { status: 404 });
  await prisma.userPermission.delete({
    where: { userId_permissionId: { userId, permissionId: permission.id } },
  });
  return NextResponse.json({ success: true });
}
