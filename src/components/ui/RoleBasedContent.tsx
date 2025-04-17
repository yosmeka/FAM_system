import { usePermissions } from "@/hooks/usePermissions";
import { ReactNode } from "react";

interface RoleBasedContentProps {
  children: ReactNode;
  permission?: string;
  fallback?: ReactNode;
}

export function RoleBasedContent({
  children,
  permission,
  fallback = null,
}: RoleBasedContentProps) {
  const { checkPermission } = usePermissions();

  if (!permission) {
    return <>{children}</>;
  }

  if (!checkPermission(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
} 