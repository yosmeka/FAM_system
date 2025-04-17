import { useRole } from "@/hooks/useRole";
import { Role } from "@/types/auth";

interface RoleBasedLoadingProps {
  role?: Role | Role[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleBasedLoading({
  role,
  children,
  fallback = <div>Loading...</div>,
}: RoleBasedLoadingProps) {
  const { hasRole, currentRole } = useRole();

  if (!currentRole) {
    return <>{fallback}</>;
  }

  if (role && !hasRole(role)) {
    return null;
  }

  return <>{children}</>;
} 