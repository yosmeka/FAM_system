import { prisma } from '@/lib/server/prisma';

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
