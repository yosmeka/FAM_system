import { usePermissionsContext } from "@/contexts/PermissionsContext";

// Dynamic permission hook: checks permissions from PermissionsContext only
export function usePermissions() {
  const { permissions, loading, refreshPermissions } = usePermissionsContext();

  const checkPermission = (permission: string): boolean => {
    if (loading) return false;
    return permissions.includes(permission);
  };

  const getPermissions = (): string[] => {
    if (loading) return [];
    return permissions;
  };

  return {
    checkPermission,
    getPermissions,
    loading,
    refreshPermissions,
  };
}