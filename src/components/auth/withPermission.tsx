import { usePermissions } from "@/hooks/usePermissions";
import { ComponentType } from "react";

export function withPermission<P extends object>(
  WrappedComponent: ComponentType<P>,
  requiredPermission: string
) {
  return function WithPermissionComponent(props: P) {
    const { checkPermission } = usePermissions();

    if (!checkPermission(requiredPermission)) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
} 