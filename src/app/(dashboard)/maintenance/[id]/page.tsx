'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RoleBasedBadge } from '@/components/ui/RoleBasedBadge';
import { RoleBasedButton } from '@/components/ui/RoleBasedButton';
import { toast } from 'react-hot-toast';
import { useRole } from '@/hooks/useRole';
import { MaintenanceApprovalModal } from '@/components/MaintenanceApprovalModal';

interface MaintenanceRequest {
  id: string;
  assetId: string;
  description: string;
  status: string;
  requesterId: string;
  managerId?: string;
  createdAt: string;
  notes?: string;
  priority?: string;
  scheduledDate?: string;
  completedAt?: string;
  asset?: {
    name: string;
    serialNumber: string;
  };
  requester?: {
    name: string;
    email: string;
  };
  manager?: {
    name: string;
    email: string;
  };
}

export default function MaintenanceRequestDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const statusToVariant: Record<string, 'success' | 'warning' | 'danger' | 'default' | 'info'> = {
    'PENDING_APPROVAL': 'info',
    'APPROVED': 'success',
    'REJECTED': 'danger',
    'SCHEDULED': 'warning',
    'IN_PROGRESS': 'warning',
    'COMPLETED': 'success',
    'CANCELLED': 'danger',
  };

  const [request, setRequest] = useState<MaintenanceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const router = useRouter();
  const { isManager, isAdmin } = useRole();

  useEffect(() => {
    fetchRequestDetails();
  }, [params.id]);

  const fetchRequestDetails = async () => {
    try {
      const response = await fetch(`/api/maintenance/${params.id}`);
      if (!response.ok) throw new Error('Failed to fetch maintenance request details');
      const data = await response.json();
      console.log('Maintenance request details:', data);
      setRequest(data);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load maintenance request details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/maintenance/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      toast.success('Status updated successfully');
      fetchRequestDetails();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!request) {
    return <div>Maintenance request not found</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Maintenance Request Details</h1>
          <RoleBasedBadge
            label={request.status}
            variant={statusToVariant[request.status as keyof typeof statusToVariant] || 'default'}
          />
        </div>

        <div className="bg-white shadow rounded-lg p-6 space-y-4">
          <div>
            <h2 className="text-lg font-medium">Asset Information</h2>
            <p className="text-gray-600">
              {request.asset?.name} ({request.asset?.serialNumber})
            </p>
          </div>

          <div>
            <h3 className="font-medium">Description</h3>
            <p className="text-gray-600">{request.description}</p>
          </div>

          <div>
            <h3 className="font-medium">Requested By</h3>
            <p className="text-gray-600">
              {request.requester?.name} ({request.requester?.email})
            </p>
          </div>

          {request.manager && (
            <div>
              <h3 className="font-medium">Assigned Manager</h3>
              <p className="text-gray-600">
                {request.manager?.name} ({request.manager?.email})
              </p>
            </div>
          )}

          <div>
            <h3 className="font-medium">Request Date</h3>
            <p className="text-gray-600">
              {new Date(request.createdAt).toLocaleDateString()}
            </p>
          </div>

          {/* Display scheduled date if available */}
          {request.scheduledDate && (
            <div>
              <h3 className="font-medium">Scheduled Date</h3>
              <p className="text-gray-600">
                {new Date(request.scheduledDate).toLocaleDateString()}
              </p>
            </div>
          )}

          {/* Display rejection notes if status is REJECTED */}
          {request.status === 'REJECTED' && request.notes && (
            <div>
              <h3 className="font-medium text-red-600">Rejection Reason</h3>
              <p className="text-gray-600 p-3 bg-red-50 border border-red-100 rounded-md mt-1">
                {request.notes}
              </p>
            </div>
          )}

          {/* Display notes for other statuses if available */}
          {request.status !== 'REJECTED' && request.notes && (
            <div>
              <h3 className="font-medium">Notes</h3>
              <p className="text-gray-600 p-3 bg-gray-50 border border-gray-100 rounded-md mt-1">
                {request.notes}
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-4 pt-4">
            <RoleBasedButton
              variant="secondary"
              onClick={() => router.push('/maintenance')}
            >
              Back to List
            </RoleBasedButton>

            {/* Approval button for managers and admins */}
            {(isManager() || isAdmin()) && request.status === 'PENDING_APPROVAL' && (
              <RoleBasedButton
                variant="primary"
                onClick={() => setIsApprovalModalOpen(true)}
                loading={loading}
              >
                Review Request
              </RoleBasedButton>
            )}

            {/* Start maintenance button for approved requests */}
            {request.status === 'APPROVED' && (
              <RoleBasedButton
                variant="primary"
                onClick={() => handleUpdateStatus('SCHEDULED')}
                loading={loading}
              >
                Schedule Maintenance
              </RoleBasedButton>
            )}

            {/* Start maintenance button for scheduled requests */}
            {request.status === 'SCHEDULED' && (
              <RoleBasedButton
                variant="primary"
                onClick={() => handleUpdateStatus('IN_PROGRESS')}
                loading={loading}
              >
                Start Maintenance
              </RoleBasedButton>
            )}

            {/* Complete maintenance button for in-progress requests */}
            {request.status === 'IN_PROGRESS' && (
              <RoleBasedButton
                variant="success"
                onClick={() => handleUpdateStatus('COMPLETED')}
                loading={loading}
              >
                Complete Maintenance
              </RoleBasedButton>
            )}
          </div>
        </div>
      </div>

      {/* Approval Modal */}
      {request && (
        <MaintenanceApprovalModal
          open={isApprovalModalOpen}
          onClose={() => setIsApprovalModalOpen(false)}
          maintenanceId={request.id}
          assetId={request.assetId}
          description={request.description}
          priority={request.priority || 'MEDIUM'}
          requesterName={request.requester?.name}
          createdAt={request.createdAt}
          onSuccess={() => {
            fetchRequestDetails();
            setIsApprovalModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
