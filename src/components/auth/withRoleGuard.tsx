import { useRole } from "@/hooks/useRole";
import { Role } from "@/types/auth";
import { ComponentType } from "react";

export function withRoleGuard<P extends object>(
  WrappedComponent: ComponentType<P>,
  requiredRole: Role | Role[]
) {
  return function WithRoleGuardComponent(props: P) {
    const { hasRole } = useRole();

    if (!hasRole(requiredRole)) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
} 