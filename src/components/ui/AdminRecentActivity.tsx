"use client";
import React from "react";

interface RecentActivityUser {
  id: string;
  name: string;
  email: string;
  role: string;
  updatedAt: string;
  createdAt: string;
}

interface RecentActivityPermission {
  id: string;
  name: string;
  description: string;
}

interface RecentActivityRoleChange {
  id: string;
  user: { id: string; name: string; email: string };
  changedByUser: { id: string; name: string; email: string };
  changedAt: string;
}

interface RecentActivity {
  users: RecentActivityUser[];
  permissions: RecentActivityPermission[];
  roleChanges: RecentActivityRoleChange[];
}

export function AdminRecentActivity({ activity }: { activity: RecentActivity }) {
  if (!activity) return null;
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-6 mb-8 w-full max-w-4xl mx-auto">
      <h3 className="text-xl font-bold mb-4 text-indigo-700 dark:text-indigo-300">Recent System Activity</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-2">Recent Users</h4>
          <ul className="text-sm text-gray-600 dark:text-gray-300">
            {activity.users?.map((u) => (
              <li key={u.id} className="mb-1">
                <span className="font-bold text-indigo-700 dark:text-indigo-300">{u.name}</span> ({u.email}) - {u.role} <span className="text-xs text-gray-400">{new Date(u.updatedAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-2">Recent Permissions</h4>
          <ul className="text-sm text-gray-600 dark:text-gray-300">
            {activity.permissions?.map((p) => (
              <li key={p.id} className="mb-1">
                <span className="font-bold text-yellow-700 dark:text-yellow-300">{p.name}</span> - {p.description}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-2">Recent Role Changes</h4>
          <ul className="text-sm text-gray-600 dark:text-gray-300">
            {activity.roleChanges?.map((r) => (
              <li key={r.id} className="mb-1">
                <span className="font-bold text-pink-700 dark:text-pink-300">{r.user.name}</span> → Changed by {r.changedByUser.name} <span className="text-xs text-gray-400">{new Date(r.changedAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
