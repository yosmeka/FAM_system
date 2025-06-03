"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuthContext } from "@/contexts/AuthContext";

interface PermissionsContextType {
  permissions: string[];
  loading: boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType>({
  permissions: [],
  loading: true,
  refreshPermissions: async () => {},
});

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthContext();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = async () => {
    if (!user?.id) { // Check for user.id as it's needed for the API call
      setPermissions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Fetch effective permissions for the specific user
      const res = await fetch(`/api/users/${user.id}/permissions`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({})); // Try to parse error, default to empty
        console.error("Failed to fetch effective permissions:", res.status, errorData);
        throw new Error(errorData.error || "Failed to fetch effective permissions");
      }
      const data = await res.json();
      // effectivePermissions is an object like { "permName": true/false }
      const effectivePermsArray = Object.entries(data.effectivePermissions || {})
        .filter(([, granted]) => granted)
        .map(([name]) => name);
      setPermissions(effectivePermsArray);
    } catch (e: unknown) { // Changed to unknown for better type safety
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error in fetchPermissions:", errorMessage);
      setPermissions([]); // Clear permissions on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
    // Re-run when user.id changes (implies user has changed or logged in/out)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Changed dependency to user.id

  return (
    <PermissionsContext.Provider value={{ permissions, loading, refreshPermissions: fetchPermissions }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissionsContext() {
  return useContext(PermissionsContext);
}
