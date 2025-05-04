import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';
// Fallback: hardcode roles if Prisma enum import fails
const roles = ['ADMIN', 'MANAGER', 'USER'];

// GET /api/role-permissions?role=ADMIN
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const role = searchParams.get('role');
  if (!role || !roles.includes(role)) return NextResponse.json({ error: 'Role is required' }, { status: 400 });

  // @ts-ignore: Prisma client may not be up to date
  const rolePermissions = await prisma.rolePermission.findMany({
    where: { role },
    include: { permission: true },
  });

  return NextResponse.json({ permissions: rolePermissions.map((rp: any) => rp.permission) });
}

// PUT /api/role-permissions?role=ADMIN
export async function PUT(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const role = searchParams.get('role');
  if (!role || !roles.includes(role)) return NextResponse.json({ error: 'Role is required' }, { status: 400 });

  const { permissionIds } = await req.json();
  if (!Array.isArray(permissionIds)) {
    return NextResponse.json({ error: 'permissionIds must be an array' }, { status: 400 });
  }

  // @ts-ignore: Prisma client may not be up to date
  await prisma.rolePermission.deleteMany({ where: { role } });

  // @ts-ignore: Prisma client may not be up to date
  await prisma.rolePermission.createMany({
    data: permissionIds.map((permissionId: string) => ({ role, permissionId })),
  });

  return NextResponse.json({ success: true });
}
