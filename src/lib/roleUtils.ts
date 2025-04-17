import { Role } from "@/types/auth";

export function checkRoleAccess(
  userRole: Role,
  requiredRole: Role | Role[]
): boolean {
  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(userRole);
  }
  return userRole === requiredRole;
}

export function getRolePermissions(role: Role): string[] {
  const permissions: Record<Role, string[]> = {
    'ADMIN': [
      "manage_users",
      "manage_assets",
      "manage_maintenance",
      "manage_disposals",
      "view_reports",
      "manage_settings",
    ],
    'MANAGER': [
      "manage_assets",
      "manage_maintenance",
      "view_reports",
    ],
    'USER': [
      "view_assets",
      "request_maintenance",
    ],
  };

  return permissions[role] || [];
}

export function hasPermission(
  userRole: Role,
  requiredPermission: string
): boolean {
  const permissions = getRolePermissions(userRole);
  return permissions.includes(requiredPermission);
} 