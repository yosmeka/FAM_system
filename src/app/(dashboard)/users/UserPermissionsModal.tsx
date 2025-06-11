"use client";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";

interface UserPermissionsModalProps {
  userId: string;
  userEmail: string;
  open: boolean;
  onClose: () => void;
}

export default function UserPermissionsModal({ userId, userEmail, open, onClose }: UserPermissionsModalProps) {
  const [allPermissions, setAllPermissions] = useState<string[]>([]);
  const [effectivePermissions, setEffectivePermissions] = useState<Record<string, boolean>>({});
  const [userOverrides, setUserOverrides] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/users/${userId}/permissions`);
        if (!res.ok) throw new Error("Failed to fetch user permissions");
        let data;
        try {
          data = await res.json();
        } catch {
          throw new Error("Invalid JSON from user permissions API");
        }
        const r = await fetch('/api/permissions');
        if (!r.ok) throw new Error("Failed to fetch permissions list");
        let pdata;
        try {
          pdata = await r.json();
        } catch {
          throw new Error("Invalid JSON from permissions API");
        }
        setAllPermissions(pdata.permissions.map((p: any) => p.name));
        setEffectivePermissions(data.effectivePermissions);
        const overrides: Record<string, boolean> = {};
        for (const up of data.userPermissions) {
          if (up.permission && up.permission.name) {
            overrides[up.permission.name] = up.granted;
          }
        }
        setUserOverrides(overrides);
      } catch (err: any) {
        toast.error(err.message || "Error loading permissions");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, userId]);

  const handleToggle = async (perm: string) => {
    setLoading(true);
    const granted = !effectivePermissions[perm];
    try {
      const res = await fetch(`/api/users/${userId}/permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissionName: perm, granted }),
      });
      if (!res.ok) {
        let errorMsg = "Failed to update permission";
        try {
          const data = await res.json();
          if (data.error) errorMsg = data.error;
        } catch {}
        throw new Error(errorMsg);
      }
      toast.success(`Permission ${granted ? "granted" : "revoked"} for ${perm}`);
      // Refresh
      const data = await fetch(`/api/users/${userId}/permissions`).then(r => r.json());
      setEffectivePermissions(data.effectivePermissions);
      const overrides: Record<string, boolean> = {};
      for (const up of data.userPermissions) {
        overrides[up.permission.name] = up.granted;
      }
      setUserOverrides(overrides);
    } catch (err: any) {
      toast.error(err.message || "Error updating permission");
    }
    setLoading(false);
  };


  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-6 min-w-[350px] max-w-[95vw] dark:bg-gray-800">
        <h2 className="text-xl font-bold mb-2 dark:text-white">Manage Permissions</h2>
        <div className="mb-2 text-sm text-gray-600 dark:text-gray-300">User: <span className="font-semibold dark:text-white">{userEmail}</span></div>
        {loading ? (
            <div className="flex items-center justify-center min-h-screen">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
            </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {allPermissions.map((perm) => (
              <div key={perm} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!effectivePermissions[perm]}
                  onChange={() => handleToggle(perm)}
                  className="accent-red-600"
                  id={perm}
                />
                <label htmlFor={perm} className="text-gray-800 cursor-pointer dark:text-white">
                  {perm}
                  {userOverrides[perm] !== undefined && (
                    <span className="ml-1 text-xs text-gray-500 dark:text-gray-300">({userOverrides[perm] ? "granted" : "revoked"} by user)</span>
                  )}
                </label>
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600"
            disabled={loading}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
