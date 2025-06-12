'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';

interface Permission {
  id: string;
  name: string;
  description?: string;
}

import { useSession } from 'next-auth/react';

export default function RolePermissionPage() {
  const { data: session, status } = useSession();
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState('MANAGER');
  const [rolePermissions, setRolePermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === 'loading' || !session?.user || session.user.role !== 'ADMIN') {
      return; // Do not fetch if loading or not authorized
    }
    // Fetch roles
    fetch('/api/roles')
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to fetch roles: ${res.status} ${res.statusText}`);
        }
        return res.json();
      })
      .then(data => {
        console.log('Loaded roles from API:', data.roles);
        // Only allow MANAGER and USER roles for assignment
        setRoles((data.roles || []).filter((role: string) => role !== 'ADMIN'));
      })
      .catch(error => {
        console.error('Error fetching roles:', error);
        toast.error('Failed to load roles. Using default roles.');
        // Fallback to default roles, but only allow MANAGER and USER
        setRoles(['MANAGER', 'USER', 'AUDITOR']);
      });

    // Fetch permissions
    fetch('/api/permissions')
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to fetch permissions: ${res.status} ${res.statusText}`);
        }
        return res.json();
      })
      .then(data => {
        // Filter out admin-only permissions from the list shown in this UI
        const adminOnlyPermissionNames = [
          'User view (list and detail)',
          'User create/invite',
          'User edit/update',
          'User delete',
          'User role assignment/change',
          'Assign role to user',
          'Password reset',
        ];
        const filteredPermissions = (data.permissions || []).filter(
          (p: Permission) => !adminOnlyPermissionNames.includes(p.name)
        );
        setPermissions(filteredPermissions);
      })
      .catch(error => {
        console.error('Error fetching permissions:', error);
        toast.error('Failed to load permissions. Please refresh the page.');
      });
  }, []);

  // TEMP: Hardcode roles for testing
  // Comment out the next line if API works
  // setRoles(['ADMIN', 'MANAGER', 'AUDITOR']);

  useEffect(() => {
    if (status === 'loading' || !session?.user || session.user.role !== 'ADMIN') {
      return; // Do not fetch if loading or not authorized
    }
    if (!selectedRole) return;
    setLoading(true);
    fetch(`/api/role-permissions?role=${selectedRole}`)
      .then(res => res.json())
      .then(data => {
        setRolePermissions(new Set((data.permissions || []).map((p: Permission) => p.id)));
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching role permissions:', error);
        toast.error('Failed to load permissions. Please try again.');
        setLoading(false);
      });
  }, [selectedRole]);

  const handleToggle = (permId: string) => {
    setRolePermissions(prev => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/role-permissions?role=${selectedRole}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissionIds: Array.from(rolePermissions) }),
      });

      if (!res.ok) {
        let errorMessage = 'Failed to update permissions.';
        try {
          const data = await res.json();
          errorMessage = data.error || errorMessage;
        } catch (jsonError) {
          console.error('Error parsing error response:', jsonError);
        }
        toast.error(errorMessage);
      } else {
        try {
          // const data = await res.json(); // data not used
          await res.json(); // consume the promise
          toast.success('Permissions updated successfully!');
        } catch (jsonErr) { // renamed to avoid conflict
          console.log('Response was OK but no JSON returned, or error parsing JSON:', jsonErr);
          toast.success('Permissions updated successfully!'); // Assume success if res.ok
        }
      }
    } catch (e: unknown) { // Changed to unknown for better type safety
      console.error('Error saving permissions:', e);
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      toast.error(`An error occurred: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading') return <div>Loading...</div>;
  if (!session?.user || session.user.role !== 'ADMIN') {
    return <div className="p-8 text-center text-red-600 text-xl font-bold">Access Denied</div>;
  }

  // --- Permission Categories ---
  const permissionCategories: { [category: string]: string[] } = {
    'Asset Management': [
      'Asset view (list and detail)',
      'Asset create',
      'Asset edit',
      'Asset delete',
      //'Asset depreciation view',
      'Asset document upload/view',
      'Asset document delete',
    ],
    'Asset Disposal': [
      'Disposal approval',
      'Disposal rejection',
    ],
    'Maintenance': [
      'Maintenance request create',
      'Maintenance request view',
      'Maintenance request edit/update',
      'Maintenance request delete/cancel',
    ],
    // 'User Management': [ // Removed as these are admin-only and not assigned to MANAGER/USER roles here
    //   'User view (list and detail)',
    //   'User create/invite',
    //   'User edit/update',
    //   'User delete',
    //   'User role assignment/change',
    //   'Assign role to user',
    //   'Password reset',
    // ],
    // 'Audits': [ // Added Audits category
    //   'Audit view',
    //   'Audit create',
    //   'Audit perform',
    //   'Audit review',
      // Add more specific audit permissions as needed
    //],
    'Reports': [ // Added Reports category
      'Report view general', // General permission to view any report
      'View asset report',
      'View audit report',
      // Add more specific report permissions as needed
    ],
    // 'Dashboard & Settings': [
    //   'Dashboard view',
    //   'Settings view/update',
    //   'Notifications (e.g. toast messages for actions)',
    //   'Access denied handling (UI feedback, redirects)',
    // ],
  };

  // Group permissions by category
  const categorizedPermissions: { [category: string]: Permission[] } = {};
  Object.entries(permissionCategories).forEach(([category, permNames]) => {
    categorizedPermissions[category] = permissions.filter(p => permNames.includes(p.name));
  });
  // Unassigned permissions
  const assignedPerms = Object.values(permissionCategories).flat();
  const uncategorized = permissions.filter(p => !assignedPerms.includes(p.name));

  return (
    <div className="rp-container">
      <h1 className="rp-title dark:text-white">Role & Permission Management</h1>
      <div className="rp-rolebar">
        {roles.length === 0 ? (
          <span className="rp-rolebar__error dark:text-white">
            No roles found. Please check your database.
          </span>
        ) : (
          <select
            value={selectedRole}
            onChange={e => setSelectedRole(e.target.value)}
            className="rp-rolebar__select dark:bg-gray-800 dark:text-white"
          >
            {roles
              .filter(role => role === 'MANAGER' || role === 'USER'|| role === 'AUDITOR')
              .map(role => (
                <option key={role} value={role} className='dark:bg-gray-800 dark:text-white'>{role}</option>
              ))}
          </select>
        )}
        <Button onClick={handleSave} className="rp-rolebar__save dark:text-white" disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>
      <div className="rp-permissions-card">
        {loading ? (
            <div className="flex items-center justify-center min-h-screen">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
            </div>
        ) : (
          <div className="rp-permissions-grid">
            {Object.entries(categorizedPermissions).map(([category, perms]) => (
              perms.length > 0 && (
                <div key={category} className="rp-permissions-section">
                  <h2 className="rp-permissions-section__title">{category}</h2>
                  {perms.map(perm => (
                    <div key={perm.id} className="rp-permission-row">
                      <input
                        type="checkbox"
                        checked={rolePermissions.has(perm.id)}
                        onChange={() => handleToggle(perm.id)}
                        id={`perm-${perm.id}`}
                      />
                      <label htmlFor={`perm-${perm.id}`} className="rp-permission-label">
                        <strong>{perm.name}</strong>
                        {perm.description && <span className="rp-permission-desc">({perm.description})</span>}
                      </label>
                    </div>
                  ))}
                </div>
              )
            ))}
            {uncategorized.length > 0 && (
              <div className="rp-permissions-section">
                <h2 className="rp-permissions-section__title">Other Permissions</h2>
                {uncategorized.map(perm => (
                  <div key={perm.id} className="rp-permission-row">
                    <input
                      type="checkbox"
                      checked={rolePermissions.has(perm.id)}
                      onChange={() => handleToggle(perm.id)}
                      id={`perm-${perm.id}`}
                    />
                    <label htmlFor={`perm-${perm.id}`} className="rp-permission-label">
                      <strong>{perm.name}</strong>
                      {perm.description && <span className="rp-permission-desc">({perm.description})</span>}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <style jsx>{`
        /* Base colors */
        :root {
          --bg-light: #fff;
          --bg-dark: #1f2937;
          --text-light: #234;
          --text-dark: #f9fafb;
          --border-light: #e5e7eb;
          --border-dark: #4b5563;
          --accent-light: #2563eb;
          --accent-dark: #f97316;
          --error-light: #e53e3e;
          --error-dark: #f87171;
          --card-bg-light: #fff;
          --card-bg-dark: #1f2937;
          --section-bg-light: #f8fafc;
          --section-bg-dark: #374151;
          --shadow-light: 0 2px 8px rgba(0,0,0,0.03);
          --shadow-dark: 0 2px 8px rgba(0,0,0,0.2);
        }

        .rp-container {
          padding: 32px;
          max-width: 1100px;
          margin: 0 auto;
          background: var(--bg-light);
          color: var(--text-light);
        }

        @media (prefers-color-scheme: dark) {
          .rp-container {
            background: var(--bg-dark);
            color: var(--text-dark);
          }
        }

        .rp-title {
          text-align: center;
          margin-bottom: 24px;
          font-size: 2.2rem;
          font-weight: 700;
          color: var(--text-light);
        }

        @media (prefers-color-scheme: dark) {
          .rp-title {
            color: var(--text-dark);
          }
        }

        .rp-rolebar {
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 24px;
          gap: 16px;
        }

        .rp-rolebar__error {
          color: var(--error-light);
          margin-right: 16px;
        }

        @media (prefers-color-scheme: dark) {
          .rp-rolebar__error {
            color: var(--error-dark);
          }
        }

        .rp-rolebar__select {
          font-size: 1rem;
          padding: 8px 14px;
          border-radius: 6px;
          border: 1px solid var(--border-light);
          background: var(--section-bg-light);
          color: var(--text-light);
          outline: none;
          transition: border 0.2s;
        }

        @media (prefers-color-scheme: dark) {
          .rp-rolebar__select {
            border: 1px solid var(--border-dark);
            background: var(--section-bg-dark);
            color: var(--text-dark);
          }
          .rp-rolebar__select:focus {
            border: 1.5px solid var(--accent-dark);
          }
          .rp-rolebar__select option {
            background: var(--section-bg-dark);
            color: var(--text-dark);
          }
          .rp-rolebar__select option:hover {
            background: var(--border-dark);
          }
        }

        .rp-rolebar__save {
          margin-left: 8px;
          min-width: 90px;
        }

        .rp-permissions-card {
          border: 1px solid var(--border-light);
          border-radius: 12px;
          padding: 32px 24px;
          background: var(--card-bg-light);
          box-shadow: var(--shadow-light);
        }

        @media (prefers-color-scheme: dark) {
          .rp-permissions-card {
            border: 1px solid var(--border-dark);
            background: var(--card-bg-dark);
            box-shadow: var(--shadow-dark);
          }
        }

        .rp-permissions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 32px;
        }

        .rp-permissions-section {
          background: var(--section-bg-light);
          border-radius: 10px;
          padding: 20px 18px 16px 18px;
          box-shadow: var(--shadow-light);
        }

        @media (prefers-color-scheme: dark) {
          .rp-permissions-section {
            background: var(--section-bg-dark);
            box-shadow: var(--shadow-dark);
          }
        }

        .rp-permissions-section__title {
          font-size: 1.18rem;
          font-weight: 600;
          margin-bottom: 14px;
          color: var(--accent-light);
        }

        @media (prefers-color-scheme: dark) {
          .rp-permissions-section__title {
            color: var(--accent-dark);
          }
        }

        .rp-permission-row {
          display: flex;
          align-items: center;
          margin-bottom: 10px;
          padding: 8px 0;
          border-bottom: 1px solid var(--border-light);
        }

        @media (prefers-color-scheme: dark) {
          .rp-permission-row {
            border-bottom: 1px solid var(--border-dark);
          }
        }

        .rp-permission-row:last-child {
          border-bottom: none;
        }

        .rp-permission-label {
          margin-left: 14px;
          font-size: 1rem;
          color: var(--text-light);
        }

        @media (prefers-color-scheme: dark) {
          .rp-permission-label {
            color: var(--text-dark);
          }
        }

        .rp-permission-desc {
          color: var(--text-light, #888);
          margin-left: 6px;
          font-size: 0.98em;
        }

        @media (prefers-color-scheme: dark) {
          .rp-permission-desc {
            color: var(--text-dark);
          }
        }

        @media (max-width: 700px) {
          .rp-container {
            padding: 10px;
          }
          .rp-permissions-card {
            padding: 14px 4px;
          }
          .rp-permissions-grid {
            gap: 14px;
          }
          .rp-permissions-section {
            padding: 12px 8px 8px 8px;
          }
        }
      `}</style>
    </div>
  );
}
