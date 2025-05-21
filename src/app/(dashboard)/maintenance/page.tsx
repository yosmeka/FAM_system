'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RoleBasedTable } from '@/components/ui/RoleBasedTable';
import { RoleBasedButton } from '@/components/ui/RoleBasedButton';
import { RoleBasedBadge } from '@/components/ui/RoleBasedBadge';
import type { MaintenanceRequest, MaintenanceStatus } from '@/types/maintenance';
import type { Column } from '@/types/reports';
import { MaintenanceApprovalModal } from '@/components/MaintenanceApprovalModal';

import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import React from 'react';

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
  const [filter, setFilter] = useState('PENDING_APPROVAL');
  // Removed reject modal state since we're using the approval modal for both approving and rejecting
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [selectedMaintenance, setSelectedMaintenance] = useState<MaintenanceRequest | null>(null);

  useEffect(() => {
    fetchMaintenanceRequests();
  }, []);

  const fetchMaintenanceRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/maintenance');
      if (!response.ok) throw new Error('Failed to fetch maintenance requests');
      const data = await response.json();
      setMaintenance(data);
    } catch (error) {
      console.error('Error fetching maintenance requests:', error);
      toast.error('Failed to load maintenance requests');
    } finally {
      setLoading(false);
    }
  };

  // Function to handle deleting a maintenance request
  const handleDeleteRequest = async (maintenanceId: string | number | Date | any) => {
    // Ensure we have a valid ID
    if (!maintenanceId || typeof maintenanceId !== 'string') {
      toast.error('Invalid maintenance request ID');
      return;
    }

    // Show confirmation dialog
    if (!window.confirm('Are you sure you want to delete this maintenance request? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/maintenance/${maintenanceId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete maintenance request');
      }

      toast.success('Maintenance request deleted successfully');
      fetchMaintenanceRequests(); // Refresh the list
    } catch (error) {
      console.error('Error deleting maintenance request:', error);
      toast.error('Failed to delete maintenance request');
    }
  };

  const getStatusVariant = (status: MaintenanceStatus): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return 'info';
      case 'APPROVED':
        return 'success';
      case 'REJECTED':
        return 'danger';
      case 'SCHEDULED':
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
      header: 'ASSET',
      render: (value, item) => (item.asset?.name || value) as string,
    },
    {
      key: 'requesterId',
      header: 'REQUESTER',
      render: (value, item) => (item.requester?.name || 'Unknown') as string,
    },
    {
      key: 'description',
      header: 'DESCRIPTION',
    },
    {
      key: 'priority',
      header: 'PRIORITY',
      render: (value) => (
        <span className="capitalize">{(value as string).toLowerCase()}</span>
      ),
    },
    {
      key: 'status',
      header: 'STATUS',
      render: (value, item) => (
        <div className="flex items-center space-x-2">
          <RoleBasedBadge
            label={value as string}
            variant={getStatusVariant(value as MaintenanceStatus)}
          />
          {(value === 'APPROVED' || value === 'REJECTED') && (
            <span title="Document available" className="text-red-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'DATE',
      render: (value) => new Date(value as Date).toLocaleDateString(),
    },
    {
      key: 'id',
      header: 'ACTIONS',
      render: (value, item) => {
        const isManager = session?.user?.role === 'MANAGER';
        const isPending = item.status === 'PENDING_APPROVAL';
        const isRequester = session?.user?.id === item.requesterId;

        return (
          <div className="flex space-x-2">
            <RoleBasedButton
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation();
                // Open the approval modal instead of navigating to detail page
                setSelectedMaintenance(item);
                setIsApprovalModalOpen(true);
              }}
              variant="secondary"
              size="sm"
            >
              View
            </RoleBasedButton>

            {/* Only managers can approve/reject pending maintenance requests they did not request */}
            {isManager && isPending && !isRequester && (
              <>
                <RoleBasedButton
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation();
                    // Open the approval modal with the selected maintenance request
                    setSelectedMaintenance(item);
                    setIsApprovalModalOpen(true);
                  }}
                  variant="success"
                  size="sm"
                >
                  Approve
                </RoleBasedButton>
                <RoleBasedButton
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation();
                    // Open the approval modal with the selected maintenance request
                    setSelectedMaintenance(item);
                    setIsApprovalModalOpen(true);
                  }}
                  variant="danger"
                  size="sm"
                >
                  Reject
                </RoleBasedButton>
              </>
            )}

            {/* Delete button - only shown for the user who created the request */}
            {isRequester && (
              <RoleBasedButton
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation();
                  handleDeleteRequest(value);
                }}
                variant="danger"
                size="sm"
              >
                Delete
              </RoleBasedButton>
            )}
          </div>
        );
      },
    },
  ];

  // Filter maintenance requests based on the selected filter
  const filteredMaintenance = filter === 'ALL'
    ? maintenance
    : maintenance.filter(req => req.status === filter);

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Maintenance Requests</h1>
        <div className="flex space-x-2">
          <select
            className="rounded-md border border-gray-300 shadow-sm p-2 focus:border-blue-500 focus:ring-blue-500"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="ALL">All Requests</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          {/* <RoleBasedButton
            onClick={() => router.push('/maintenance/new')}
            variant="primary"
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            New Maintenance Request
          </RoleBasedButton> */}
        </div>
      </div>

      <RoleBasedTable
        data={filteredMaintenance}
        columns={columns}
        loading={loading}
        onRowClick={(row) => {
          setSelectedMaintenance(row);
          setIsApprovalModalOpen(true);
        }}
      />

      {/* Rejection modal removed - using the approval modal for both approving and rejecting */}

      {/* Maintenance Approval Modal */}
      {selectedMaintenance && (
        <MaintenanceApprovalModal
          open={isApprovalModalOpen}
          onClose={() => {
            setIsApprovalModalOpen(false);
            setSelectedMaintenance(null);
          }}
          maintenanceId={selectedMaintenance.id}
          assetId={selectedMaintenance.assetId}
          description={selectedMaintenance.description}
          priority={selectedMaintenance.priority || 'MEDIUM'}
          requesterName={selectedMaintenance.requester?.name}
          createdAt={selectedMaintenance.createdAt}
          onSuccess={() => {
            fetchMaintenanceRequests();
            setIsApprovalModalOpen(false);
            setSelectedMaintenance(null);
          }}
        />
      )}
    </div>
  );
}