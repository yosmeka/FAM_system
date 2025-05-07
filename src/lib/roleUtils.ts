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