'use client';
import { useEffect, useState } from 'react';
import { Switch } from '@/components/ui/Switch';
import { Button } from '@/components/ui/Button';
import { toast } from 'react-hot-toast';

interface Permission {
  id: string;
  name: string;
  description?: string;
}

export default function RolePermissionPage() {
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState('ADMIN');
  const [rolePermissions, setRolePermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/roles')
      .then(res => res.json())
      .then(data => {
        console.log('Loaded roles from API:', data.roles);
        setRoles(data.roles || []);
      });
    fetch('/api/permissions')
      .then(res => res.json())
      .then(data => setPermissions(data.permissions || []));
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
        const data = await res.json();
        toast.error(data.error || 'Failed to update permissions.');
      } else {
        toast.success('Permissions updated successfully!');
      }
    } catch (e: any) {
      toast.error('An error occurred while updating permissions.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 32, maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: 24 }}>
        Role & Permission Management
      </h1>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
        {roles.length === 0 ? (
          <span style={{ color: 'red', marginRight: 16 }}>
            No roles found. Please check your API or database.
          </span>
        ) : (
          <select
            value={selectedRole}
            onChange={e => setSelectedRole(e.target.value)}
            style={{ fontSize: 16, padding: '8px 12px' }}
          >
            {roles.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        )}
        <Button onClick={handleSave} style={{ marginLeft: 16 }} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>
      <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 24, background: '#fff' }}>
        {loading ? (
          <div>Loading permissions...</div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 24,
          }}>
            {permissions.map(perm => (
              <div key={perm.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                <Switch
                  checked={rolePermissions.has(perm.id)}
                  onCheckedChange={() => handleToggle(perm.id)}
                  id={`perm-${perm.id}`}
                />
                <label htmlFor={`perm-${perm.id}`} style={{ marginLeft: 12 }}>
                  <strong>{perm.name}</strong>
                  {perm.description && <span style={{ color: '#888', marginLeft: 6 }}>({perm.description})</span>}
                </label>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
