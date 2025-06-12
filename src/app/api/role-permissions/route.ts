import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
// Fallback: hardcode roles if Prisma enum import fails
const roles = ['ADMIN', 'MANAGER', 'USER', 'AUDITOR']; // Added AUDITOR

// GET /api/role-permissions?role=ADMIN
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');
    if (!role || !roles.includes(role)) {
      return Response.json({ error: 'Role is required or invalid' }, { status: 400 });
    }

    // @ts-ignore: Prisma client may not be up to date
    const rolePermissions = await prisma.rolePermission.findMany({
      where: { role },
      include: { permission: true },
    });

    return Response.json({ permissions: rolePermissions.map((rp: any) => rp.permission) });
  } catch (error) {
    console.error('Error fetching role permissions:', error);
    return Response.json(
      { error: 'Failed to fetch role permissions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUT /api/role-permissions?role=ADMIN
export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');
    if (!role || !roles.includes(role)) {
      return Response.json({ error: 'Role is required or invalid' }, { status: 400 });
    }
    if (role === 'ADMIN') {
      return Response.json({ error: 'Cannot update permissions for ADMIN role' }, { status: 403 });
    }

    let body;
    try {
      body = await req.json();
    } catch (jsonError) {
      console.error('Error parsing request body:', jsonError);
      return Response.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { permissionIds } = body;
    if (!Array.isArray(permissionIds)) {
      return Response.json({ error: 'permissionIds must be an array' }, { status: 400 });
    }

    // @ts-ignore: Prisma client may not be up to date
    await prisma.rolePermission.deleteMany({ where: { role } });

    // @ts-ignore: Prisma client may not be up to date
    await prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId: string) => ({ role, permissionId })),
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error updating role permissions:', error);
    return Response.json(
      { error: 'Failed to update role permissions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
