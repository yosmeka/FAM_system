'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { toast } from 'react-hot-toast';

interface Permission {
  id: string;
  name: string;
  description?: string;
}

import { useSession } from 'next-auth/react';

export default function RolePermissionPage() {
  const { data: session, status } = useSession();

  if (status === 'loading') return <div>Loading...</div>;
  if (!session?.user || session.user.role !== 'ADMIN') {
    return <div className="p-8 text-center text-red-600 text-xl font-bold">Access Denied</div>;
  }
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState('ADMIN');
  const [rolePermissions, setRolePermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
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
        setRoles(data.roles || []);
      })
      .catch(error => {
        console.error('Error fetching roles:', error);
        toast.error('Failed to load roles. Using default roles.');
        // Fallback to default roles
        setRoles(['ADMIN', 'MANAGER', 'USER']);
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
        setPermissions(data.permissions || []);
      })
      .catch(error => {
        console.error('Error fetching permissions:', error);
        toast.error('Failed to load permissions. Please refresh the page.');
      });
  }, []);

  // TEMP: Hardcode roles for testing
  // Comment out the next line if API works
  // setRoles(['ADMIN', 'MANAGER', 'USER']);

  useEffect(() => {
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
          const data = await res.json();
          toast.success('Permissions updated successfully!');
        } catch (jsonError) {
          console.log('Response was OK but no JSON returned');
          toast.success('Permissions updated successfully!');
        }
      }
    } catch (e: any) {
      console.error('Error saving permissions:', e);
      toast.error(`An error occurred: ${e.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  // --- Permission Categories ---
  const permissionCategories: { [category: string]: string[] } = {
    'Asset Management': [
      'Asset view (list and detail)',
      'Asset create',
      'Asset edit',
      'Asset delete',
      'Asset depreciation view',
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
    'User Management': [
      'User view (list and detail)',
      'User create/invite',
      'User edit/update',
      'User delete',
      'User role assignment/change',
      'Assign role to user',
      'Password reset',
    ],
    'Dashboard & Settings': [
      'Dashboard view',
      'Settings view/update',
      'Notifications (e.g. toast messages for actions)',
      'Access denied handling (UI feedback, redirects)',
    ],
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
      <h1 className="rp-title">Role & Permission Management</h1>
      <div className="rp-rolebar">
        {roles.length === 0 ? (
          <span className="rp-rolebar__error">
            No roles found. Please check your API or database.
          </span>
        ) : (
          <select
            value={selectedRole}
            onChange={e => setSelectedRole(e.target.value)}
            className="rp-rolebar__select"
          >
            {roles.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        )}
        <Button onClick={handleSave} className="rp-rolebar__save" disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>
      <div className="rp-permissions-card">
        {loading ? (
          <div>Loading permissions...</div>
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
        .rp-container {
          padding: 32px;
          max-width: 1100px;
          margin: 0 auto;
        }
        .rp-title {
          text-align: center;
          margin-bottom: 24px;
          font-size: 2.2rem;
          font-weight: 700;
          color: #234;
        }
        .rp-rolebar {
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 24px;
          gap: 16px;
        }
        .rp-rolebar__error {
          color: #e53e3e;
          margin-right: 16px;
        }
        .rp-rolebar__select {
          font-size: 1rem;
          padding: 8px 14px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          background: #f8fafc;
          outline: none;
          transition: border 0.2s;
        }
        .rp-rolebar__select:focus {
          border: 1.5px solid #2563eb;
        }
        .rp-rolebar__save {
          margin-left: 8px;
          min-width: 90px;
        }
        .rp-permissions-card {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 32px 24px;
          background: #fff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.03);
        }
        .rp-permissions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 32px;
        }
        .rp-permissions-section {
          background: #f8fafc;
          border-radius: 10px;
          padding: 20px 18px 16px 18px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
        }
        .rp-permissions-section__title {
          font-size: 1.18rem;
          font-weight: 600;
          margin-bottom: 14px;
          color: #2563eb;
        }
        .rp-permission-row {
          display: flex;
          align-items: center;
          margin-bottom: 10px;
          padding: 8px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .rp-permission-row:last-child {
          border-bottom: none;
        }
        .rp-permission-label {
          margin-left: 14px;
          font-size: 1rem;
          color: #222;
        }
        .rp-permission-desc {
          color: #888;
          margin-left: 6px;
          font-size: 0.98em;
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
