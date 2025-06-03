import { usePermissionsContext } from "@/contexts/PermissionsContext";
import React from "react";

// Dynamic permission hook: checks permissions from PermissionsContext only
export function usePermissions() {
  const { permissions, loading, refreshPermissions } = usePermissionsContext();

  const checkPermission = React.useCallback((permission: string): boolean => {
    if (loading) return false;
    return permissions.includes(permission);
  }, [permissions, loading]);

  const getPermissions = React.useCallback((): string[] => {
    if (loading) return [];
    return permissions;
  }, [permissions, loading]);

  return {
    checkPermission,
    getPermissions,
    loading,
    refreshPermissions,
  };
}