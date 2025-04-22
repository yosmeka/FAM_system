'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RoleBasedBadge } from '@/components/ui/RoleBasedBadge';
import { RoleBasedButton } from '@/components/ui/RoleBasedButton';
import { toast } from 'react-hot-toast';

interface TransferDetails {
  id: string;
  assetId: string;
  fromLocation: string;
  toLocation: string;
  reason: string;
  status: string;
  createdAt: string;
  asset?: {
    name: string;
    serialNumber: string;
  };
}

export default function TransferDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const [transfer, setTransfer] = useState<TransferDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchTransferDetails();
  }, [params.id]);

  const fetchTransferDetails = async () => {
    try {
      const response = await fetch(`/api/transfers/${params.id}`);
      if (!response.ok) throw new Error('Failed to fetch transfer details');
      const data = await response.json();
      setTransfer(data);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load transfer details');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/transfers/${params.id}/approve`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to approve transfer');

      toast.success('Transfer approved successfully');
      fetchTransferDetails();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to approve transfer');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!transfer) {
    return <div>Transfer not found</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Transfer Details</h1>
          <RoleBasedBadge label={transfer.status} />
        </div>

        <div className="bg-white shadow rounded-lg p-6 space-y-4">
          <div>
            <h2 className="text-lg font-medium">Asset Information</h2>
            <p className="text-gray-600">
              {transfer.asset?.name} ({transfer.asset?.serialNumber})
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium">From Location</h3>
              <p className="text-gray-600">{transfer.fromLocation}</p>
            </div>
            <div>
              <h3 className="font-medium">To Location</h3>
              <p className="text-gray-600">{transfer.toLocation}</p>
            </div>
          </div>

          <div>
            <h3 className="font-medium">Reason</h3>
            <p className="text-gray-600">{transfer.reason}</p>
          </div>

          <div>
            <h3 className="font-medium">Request Date</h3>
            <p className="text-gray-600">
              {new Date(transfer.createdAt).toLocaleDateString()}
            </p>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <RoleBasedButton
              variant="secondary"
              onClick={() => router.push('/transfers')}
            >
              Back to List
            </RoleBasedButton>
            {transfer.status === 'PENDING' && (
              <RoleBasedButton
                variant="primary"
                onClick={handleApprove}
                loading={loading}
              >
                Approve Transfer
              </RoleBasedButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
