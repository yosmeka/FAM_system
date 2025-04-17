import { useRole } from "@/hooks/useRole";
import { getRolePermissions, hasPermission } from "@/lib/roleUtils";

export function usePermissions() {
  const { currentRole } = useRole();

  const checkPermission = (permission: string): boolean => {
    if (!currentRole) return false;
    return hasPermission(currentRole, permission);
  };

  const getPermissions = (): string[] => {
    if (!currentRole) return [];
    return getRolePermissions(currentRole);
  };

  const canManageUsers = () => checkPermission("manage_users");
  const canManageAssets = () => checkPermission("manage_assets");
  const canManageMaintenance = () => checkPermission("manage_maintenance");
  const canManageDisposals = () => checkPermission("manage_disposals");
  const canViewReports = () => checkPermission("view_reports");
  const canManageSettings = () => checkPermission("manage_settings");

  return {
    checkPermission,
    getPermissions,
    canManageUsers,
    canManageAssets,
    canManageMaintenance,
    canManageDisposals,
    canViewReports,
    canManageSettings,
  };
} 