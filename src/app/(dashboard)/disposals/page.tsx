'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RoleBasedTable } from '@/components/ui/RoleBasedTable';
import { RoleBasedButton } from '@/components/ui/RoleBasedButton';
import { RoleBasedBadge } from '@/components/ui/RoleBasedBadge';
import type { DisposalRequest, DisposalStatus } from '@/types/disposals';
import type { Column } from '@/types/reports';

export default function DisposalsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [disposals, setDisposals] = useState<DisposalRequest[]>([]);

  useEffect(() => {
    fetchDisposals();
  }, []);

  const fetchDisposals = async () => {
    try {
      const response = await fetch('/api/disposals');
      if (!response.ok) throw new Error('Failed to fetch disposals');
      const data = await response.json();
      setDisposals(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status: DisposalStatus): 'success' | 'warning' | 'danger' | 'default' => {
  switch (status) {
    case 'APPROVED':
      return 'success';
    case 'REJECTED':
      return 'danger';
    case 'PENDING':
      return 'warning';
    default:
      return 'default';
  }
};

const columns: Column<DisposalRequest>[] = [
    {
      key: 'assetId',
      header: 'Asset',
      render: (value, item) => typeof item.asset?.name === 'string' ? item.asset.name : String(value),
    },
    {
      key: 'method',
      header: 'Method',
      render: (value) => <span className="capitalize">{(value as string).toLowerCase()}</span>,
    },
    {
      key: 'expectedValue',
      header: 'Expected Value',
      render: (value) => `$${(value as number).toFixed(2)}`,
    },
    {
      key: 'actualValue',
      header: 'Actual Value',
      render: (value) => (typeof value === 'number' ? `$${value.toFixed(2)}` : 'N/A'),
    },
    {
      key: 'status',
      header: 'Status',
      render: (value) => (
        <RoleBasedBadge
          label={value as string}
          variant={getStatusVariant(value as DisposalStatus)}
        />
      ),
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (value) => typeof value === 'string' || typeof value === 'number' ? String(value) : value instanceof Date ? value.toLocaleDateString() : '',
    },
    {
      key: 'id',
      header: 'Actions',
      render: (value, item) => (
        <div className="flex space-x-2">
          <RoleBasedButton
            onClick={() => router.push(`/disposals/${value}`)}
            variant="secondary"
            size="sm"
          >
            View
          </RoleBasedButton>
        </div>
      ),
    },
  ];

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Asset Disposals</h1>
        <RoleBasedButton
          onClick={() => router.push('/disposals/new')}
          variant="primary"
        >
          New Disposal Request
        </RoleBasedButton>
      </div>

      <RoleBasedTable
        data={disposals}
        columns={columns}
        loading={loading}
        onRowClick={(value) => router.push(`/disposals/${value}`)}
      />
    </div>
  );
}