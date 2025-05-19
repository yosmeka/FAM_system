'use client';

import React from 'react';

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
    status?: string;
    location?: string;
    currentValue?: number;
  };
  requester?: {
    name?: string;
    email?: string;
    id?: string;
  };
}

import { useSession } from 'next-auth/react';

export default function TransferDetailsPage({ params }: { params: any }) {
  const { data: session } = useSession();
  const { id } = React.use(params) as { id: string };
  const [transfer, setTransfer] = useState<TransferDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleted, setDeleted] = useState(false);

  const router = useRouter();

  useEffect(() => {
    if (!deleted) {
      fetchTransferDetails();
    }
  }, [id, deleted]);

  const fetchTransferDetails = async () => {
    try {
      const response = await fetch(`/api/transfers/${id}`);
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




  useEffect(() => {
    if (deleted) {
      router.push('/transfers');
      router.refresh();
    }
  }, [deleted, router]);

  if (deleted) {
    return <div>Redirecting...</div>;
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!transfer) {
    return <div>Transfer not found</div>;
  }

  // Delete handler
  async function handleDelete() {
    if (!window.confirm('Are you sure you want to delete this transfer request?')) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/transfers/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete transfer');
      toast.success('Transfer request deleted');
      setDeleted(true);
    } catch (error) {
      toast.error('Failed to delete transfer');
    } finally {
      setLoading(false);
    }
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
            <div className="text-gray-600 space-y-1">
              <div><b>Name:</b> {transfer.asset?.name}</div>
              <div><b>Serial Number:</b> {transfer.asset?.serialNumber}</div>
              {transfer.asset?.status && <div><b>Status:</b> {transfer.asset.status}</div>}
              {transfer.asset?.location && <div><b>Location:</b> {transfer.asset.location}</div>}
              {transfer.asset?.currentValue !== undefined && <div><b>Value:</b> ${transfer.asset.currentValue?.toLocaleString?.() ?? transfer.asset.currentValue}</div>}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-medium">Requester Information</h2>
            <div className="text-gray-600 space-y-1">
              <div><b>Name:</b> {transfer.requester?.name || 'Unknown'}</div>
              <div><b>Email:</b> {transfer.requester?.email || 'Unknown'}</div>
            </div>
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
            {/* Show Edit button only if transfer is pending and user is the requester */}
            {transfer.status === 'PENDING' &&
              session?.user?.id === transfer.requester?.id && (
                <RoleBasedButton
                  variant="primary"
                  onClick={() => router.push(`/transfers/${transfer.id}/edit`)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Edit
                </RoleBasedButton>
              )
            }
            {transfer.status === 'PENDING' && (
              <RoleBasedButton
                variant="danger"
                onClick={handleDelete}
                loading={loading}
              >
                Delete Transfer
              </RoleBasedButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
