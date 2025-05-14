'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RoleBasedTable } from '@/components/ui/RoleBasedTable';
import { RoleBasedButton } from '@/components/ui/RoleBasedButton';
import { RoleBasedBadge } from '@/components/ui/RoleBasedBadge';
import type { MaintenanceRequest, MaintenanceStatus } from '@/types/maintenance';
import type { Column } from '@/types/reports';

import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';

export default function MaintenancePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === 'loading') return null;
  if (status !== 'authenticated' || !session) {
    return null;
  }
  if (session.user.role === 'ADMIN') {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-semibold text-center text-red-600">Access Denied</h1>
        <p className="text-center">You do not have permission to view maintenance requests.</p>
      </div>
    );
  }

  useEffect(() => {
    if (status !== 'authenticated' || !session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      router.replace('/dashboard');
      toast.error('Access denied: Only Admins and Managers can view maintenance requests.');
    }
  }, [session, status, router]);

  const [loading, setLoading] = useState(true);
  const [maintenance, setMaintenance] = useState<MaintenanceRequest[]>([]);

  useEffect(() => {
    fetchMaintenanceRequests();
  }, []);

  const fetchMaintenanceRequests = async () => {
    try {
      const response = await fetch('/api/maintenance');
      if (!response.ok) throw new Error('Failed to fetch maintenance requests');
      const data = await response.json();
      setMaintenance(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status: MaintenanceStatus): 'success' | 'warning' | 'danger' | 'default' => {

    switch (status) {
      case 'PENDING':
        return 'warning';
      case 'IN_PROGRESS':
        return 'warning';
      case 'COMPLETED':
        return 'success';
      case 'CANCELLED':
        return 'danger';
      default:
        return 'default';
    }
  };

  const columns: Column<MaintenanceRequest>[] = [
    {
      key: 'assetId',
      header: 'Asset',
      render: (value, item) => (item.asset?.name || value) as string,
    },
    {
      key: 'description',
      header: 'Description',
    },
    {
      key: 'status',
      header: 'Status',
      render: (value, item) => (
        <RoleBasedBadge
          label={value as string}
          variant={getStatusVariant(value as MaintenanceStatus)}
        />
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (value) => (
        <span className="capitalize">{(value as string).toLowerCase()}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (value) => new Date(value as Date).toLocaleDateString(),
    },
  ];

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Maintenance Requests</h1>
        <RoleBasedButton
          onClick={() => router.push('/maintenance/new')}
          variant="primary"
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          New Maintenance Request
        </RoleBasedButton>
      </div>

      <RoleBasedTable
        data={maintenance}
        columns={columns}
        loading={loading}
        onRowClick={(row) => router.push(`/maintenance/${row.id}`)}
      />
    </div>
  );
}