import { prisma } from "@/lib/server/prisma";

/**
 * Checks if a user has a specific permission, considering both user-specific overrides and role-based permissions.
 * @param userId - The user's unique ID
 * @param role - The user's role (e.g., ADMIN, MANAGER, USER)
 * @param permissionName - The permission to check (by name)
 * @returns boolean (true if allowed, false if not)
 */
export async function userHasPermission(userId: string, role: string, permissionName: string): Promise<boolean> {
  const permission = await prisma.permission.findUnique({ where: { name: permissionName } });
  if (!permission) return false;

  // 1. Check user-specific override
  const userPerm = await prisma.userPermission.findUnique({
    where: { userId_permissionId: { userId, permissionId: permission.id } },
  });
  if (userPerm) return userPerm.granted;

  // 2. Fallback to role-permission
  const rolePerm = await prisma.rolePermission.findFirst({
    where: { role, permissionId: permission.id },
  });
  return !!rolePerm;
}
