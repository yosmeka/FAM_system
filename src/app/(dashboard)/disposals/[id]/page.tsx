'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RoleBasedBadge } from '@/components/ui/RoleBasedBadge';
import { RoleBasedButton } from '@/components/ui/RoleBasedButton';
import { toast } from 'react-hot-toast';
import { useSession } from 'next-auth/react';

interface DisposalDetails {
  id: string;
  assetId: string;
  method: string;
  reason: string;
  status: string;
  expectedValue: number;
  actualValue: number | null;
  createdAt: string;
  asset?: {
    name: string;
    serialNumber: string;
    status?: string;
    currentValue?: number;
  };
  requester?: {
    name?: string;
    email?: string;
    id?: string;
  };
}

export default function DisposalDetailsPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession();
  const [disposal, setDisposal] = useState<DisposalDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleted, setDeleted] = useState(false);

  const router = useRouter();

  useEffect(() => {
    if (!deleted) {
      fetchDisposalDetails();
    }
  }, [params.id, deleted]);

  const fetchDisposalDetails = async () => {
    try {
      const response = await fetch(`/api/disposals/${params.id}`);
      if (!response.ok) throw new Error('Failed to fetch disposal details');
      const data = await response.json();
      setDisposal(data);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load disposal details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (deleted) {
      router.push('/disposals');
      router.refresh();
    }
  }, [deleted, router]);

  if (deleted) {
    return <div>Redirecting...</div>;
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!disposal) {
    return <div>Disposal not found</div>;
  }

  // Delete handler
  async function handleDelete() {
    if (!window.confirm('Are you sure you want to delete this disposal request?')) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/disposals/${params.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete disposal');
      toast.success('Disposal request deleted');
      setDeleted(true);
    } catch (error) {
      toast.error('Failed to delete disposal');
    } finally {
      setLoading(false);
    }
  }

  // Approve handler
  async function handleApprove() {
    try {
      setLoading(true);
      const response = await fetch(`/api/disposals/${params.id}/approve`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to approve disposal');
      toast.success('Disposal request approved');
      fetchDisposalDetails();
    } catch (error) {
      toast.error('Failed to approve disposal');
    } finally {
      setLoading(false);
    }
  }

  // Reject handler
  async function handleReject() {
    try {
      setLoading(true);
      const response = await fetch(`/api/disposals/${params.id}/reject`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to reject disposal');
      toast.success('Disposal request rejected');
      fetchDisposalDetails();
    } catch (error) {
      toast.error('Failed to reject disposal');
    } finally {
      setLoading(false);
    }
  }

  const isPending = disposal.status === 'PENDING';
  const isManager = session?.user?.role === 'MANAGER';
  const isRequester = session?.user?.id === disposal.requester?.id;

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Disposal Details</h1>
          <RoleBasedBadge label={disposal.status} />
        </div>

        <div className="bg-white shadow rounded-lg p-6 space-y-4">
          <div>
            <h2 className="text-lg font-medium">Asset Information</h2>
            <div className="text-gray-600 space-y-1">
              <div><b>Name:</b> {disposal.asset?.name}</div>
              <div><b>Serial Number:</b> {disposal.asset?.serialNumber}</div>
              {disposal.asset?.status && <div><b>Status:</b> {disposal.asset.status}</div>}
              {disposal.asset?.currentValue !== undefined && <div><b>Current Value:</b> ${disposal.asset.currentValue?.toLocaleString?.() ?? disposal.asset.currentValue}</div>}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-medium">Requester Information</h2>
            <div className="text-gray-600 space-y-1">
              <div><b>Name:</b> {disposal.requester?.name || 'Unknown'}</div>
              <div><b>Email:</b> {disposal.requester?.email || 'Unknown'}</div>
            </div>
          </div>

          <div>
            <h3 className="font-medium">Disposal Method</h3>
            <p className="text-gray-600 capitalize">{disposal.method.toLowerCase()}</p>
          </div>

          <div>
            <h3 className="font-medium">Reason</h3>
            <p className="text-gray-600">{disposal.reason}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium">Expected Value</h3>
              <p className="text-gray-600">${disposal.expectedValue.toFixed(2)}</p>
            </div>
            <div>
              <h3 className="font-medium">Actual Value</h3>
              <p className="text-gray-600">{disposal.actualValue ? `$${disposal.actualValue.toFixed(2)}` : 'N/A'}</p>
            </div>
          </div>

          <div>
            <h3 className="font-medium">Request Date</h3>
            <p className="text-gray-600">
              {new Date(disposal.createdAt).toLocaleDateString()}
            </p>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <RoleBasedButton
              variant="secondary"
              onClick={() => router.push('/disposals')}
            >
              Back to List
            </RoleBasedButton>

            {isPending && isRequester && (
              <RoleBasedButton
                variant="primary"
                onClick={() => router.push(`/disposals/${disposal.id}/edit`)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Edit
              </RoleBasedButton>
            )}

            {isPending && isManager && !isRequester && (
              <>
                <RoleBasedButton
                  variant="success"
                  onClick={handleApprove}
                  loading={loading}
                >
                  Approve
                </RoleBasedButton>
                <RoleBasedButton
                  variant="danger"
                  onClick={handleReject}
                  loading={loading}
                >
                  Reject
                </RoleBasedButton>
              </>
            )}

            {isPending && isRequester && (
              <RoleBasedButton
                variant="danger"
                onClick={handleDelete}
                loading={loading}
              >
                Delete
              </RoleBasedButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
