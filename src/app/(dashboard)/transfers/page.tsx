'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RoleBasedTable } from '@/components/ui/RoleBasedTable';
import { RoleBasedButton } from '@/components/ui/RoleBasedButton';
import { RoleBasedBadge } from '@/components/ui/RoleBasedBadge';
import type { TransferRequest, TransferStatus } from '@/types/transfers';
import type { Column } from '@/types/reports';

import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';

import React from 'react';

// Delete Confirmation Modal Component
function DeleteConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  assetName 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void;
  assetName: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
        <h3 className="text-lg font-semibold mb-4 dark:text-white">Confirm Deletion</h3>
        <p className="mb-4 dark:text-white">
          Are you sure you want to delete the transfer request for asset "{assetName}"? 
          This action cannot be undone.
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-200 dark:hover:text-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TransfersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  // All hooks MUST be called at the top, before any return!
  const [loading, setLoading] = useState(true);
  const [transfers, setTransfers] = useState<TransferRequest[]>([]);
  const [rejectModal, setRejectModal] = useState<{ open: boolean; transferId: string | null }>({ open: false, transferId: null });
  const [rejectReason, setRejectReason] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; transferId: string | null; assetName: string }>({ open: false, transferId: null, assetName: '' });
  // Pagination state
  const [page, setPage] = useState(1);
  const pageSize = 6;
  const totalPages = Math.ceil(transfers.length / pageSize);
  const paginatedTransfers = transfers.slice((page - 1) * pageSize, page * pageSize);
  // Reset page to 1 when transfers data changes
  React.useEffect(() => {
    setPage(1);
  }, [transfers]);

  // DEBUG: Log session user id and transfers
  if (typeof window !== 'undefined') {
    console.log('Session user id:', session?.user?.id);
    console.log('Session user:', session?.user);
    console.log('Transfers:', transfers);
  }


// Show nothing until session is loaded
  // if (loading){
  //   return (
  //     <div className="flex justify-center items-center min-h-screen bg-white dark:bg-gray-900">
  //       <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500 dark:border-red-400"></div>
  //     </div>
  //   );
  // } 

  // If not allowed, show access denied
  if (session?.user?.role === 'AUDITOR') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="bg-white p-8 rounded shadow text-center">
          <h1 className="text-2xl font-bold mb-2 text-red-600">Access Denied</h1>
          <p className="text-gray-700">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }




  useEffect(() => {
    fetchTransfers();
  }, []);

  const fetchTransfers = async () => {
    try {
      const response = await fetch('/api/transfers');
      if (!response.ok) throw new Error('Failed to fetch transfers');
      const data = await response.json();
      setTransfers(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status: TransferStatus): 'success' | 'warning' | 'danger' | 'default' => {
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

  const columns: Column<TransferRequest>[] = [
    {
      key: 'assetId',
      header: 'Asset',
      render: (value, item) => (item.asset?.name || value) as string,
    },
    {
      key: 'requesterId',
      header: 'Requester',
      render: (value, item) => (item.requester?.name || 'Unknown') as string,
    },
    {
      key: 'fromDepartment',
      header: 'From',
    },
    {
      key: 'toDepartment',
      header: 'To',
    },
    {
      key: 'status',
      header: 'Status',
      render: (value, item) => (
        <div className="flex items-center space-x-2">
          <RoleBasedBadge
            label={value as string}
            variant={getStatusVariant(value as TransferStatus)}
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
      header: 'Date',
      render: (value) => new Date(value as Date).toLocaleDateString(),
    },
    {
      key: 'id',
      header: 'Actions',
      render: (value, item) => {
        const transferId = typeof value === 'string' ? value : '';
        const isManager = session?.user?.role === 'MANAGER';
        const isPending = item.status === 'PENDING';
        const isRequester = session?.user?.id === item.requester?.id;
        return (
          <div className="flex space-x-2">
            <RoleBasedButton
              onClick={() => router.push(`/transfers/${transferId}`)}
              variant="secondary"
              size="sm"
            >
              View
            </RoleBasedButton>
            {/* Only requester can edit/delete pending transfers */}
            {isPending && isRequester && (
              <>
                <RoleBasedButton
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation();
                    router.push(`/transfers/${transferId}/edit`);
                  }}
                  variant="primary"
                  size="sm"
                >
                  Edit
                </RoleBasedButton>
                <RoleBasedButton
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation();
                    setDeleteModal({ open: true, transferId: transferId, assetName: item.asset?.name || transferId });
                  }}
                  variant="danger"
                  size="sm"
                >
                  Delete
                </RoleBasedButton>
              </>
            )}
            {/* Only managers can approve/reject pending transfers they did not request */}
            {isManager && isPending && !isRequester && (
              <>
                <RoleBasedButton
                  onClick={async (e: React.MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation();
                    try {
                      const response = await fetch(`/api/transfers/${transferId}/approve`, { method: 'POST' });
                      if (!response.ok) throw new Error('Failed to approve');
                      toast.success('Transfer approved');
                      fetchTransfers();
                    } catch {
                      toast.error('Failed to approve transfer');
                    }
                  }}
                  variant="success"
                  size="sm"
                >
                  Approve
                </RoleBasedButton>
                <RoleBasedButton
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation();
                    setRejectModal({ open: true, transferId: typeof transferId === 'string' ? transferId : null });
                  }}
                  variant="danger"
                  size="sm"
                >
                  Reject
                </RoleBasedButton>
              </>
            )}
            {/* Only requester can complete approved transfers */}
            {item.status === 'APPROVED' && isRequester && (
              <RoleBasedButton
                onClick={async (e: React.MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation();
                  try {
                    const response = await fetch(`/api/transfers/${transferId}/complete`, { method: 'POST' });
                    if (!response.ok) throw new Error('Failed to complete transfer');
                    toast.success('Transfer marked as completed.');
                    fetchTransfers();
                  } catch {
                    toast.error('Failed to complete transfer');
                  }
                }}
                variant="success"
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Complete Transfer
              </RoleBasedButton>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Asset Transfers</h1>
        {session && (
          <div className="flex space-x-4">
            {session.user.role === 'USER' && (
              <>
                <RoleBasedButton
                  variant="secondary"
                  onClick={() => router.push('/transfers/documents')}
                  className="flex items-center space-x-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>My Documents</span>
                </RoleBasedButton>
                <RoleBasedButton
                  onClick={() => router.push('/transfers/new')}
                  variant="primary"
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  New Transfer
                </RoleBasedButton>
              </>
            )}
          </div>
        )}
      </div>

      <RoleBasedTable
        data={paginatedTransfers}
        columns={columns}
        loading={loading}
        onRowClick={(row) => router.push(`/transfers/${row.id}`)}
      />
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 py-4 dark:bg-gray-900 border-t">
          <button
            className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50 dark:bg-gray-800 dark:hover:bg-gray-700"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </button>
          <span className="text-sm text-gray-700">
            Page {page} of {totalPages}
          </span>
          <button
            className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectModal.open && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black  bg-opacity-50">
          <div className="bg-white dark:bg-gray-900 p-6 rounded shadow-lg w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Reason for Rejection</h2>
            <textarea
              className="w-full border dark:bg-gray-800 rounded p-2 mb-4"
              rows={4}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Please provide a reason for rejecting this transfer."
            />
            <div className="flex justify-end space-x-2">
              <button
                className="px-4 py-2 bg-gray-300 dark:text-gray-800 rounded"
                onClick={() => {
                  setRejectModal({ open: false, transferId: null });
                  setRejectReason('');
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded"
                onClick={async () => {
                  if (!rejectReason) {
                    toast.error('Rejection reason is required.');
                    return;
                  }
                  try {
                    const response = await fetch(`/api/transfers/${rejectModal.transferId}/reject`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ reason: rejectReason }),
                    });
                    if (!response.ok) throw new Error('Failed to reject');
                    toast.success('Transfer rejected');
                    fetchTransfers();
                  } catch {
                    toast.error('Failed to reject transfer');
                  } finally {
                    setRejectModal({ open: false, transferId: null });
                    setRejectReason('');
                  }
                }}
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
      <DeleteConfirmationModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, transferId: null, assetName: '' })}
        onConfirm={async () => {
          try {
            const response = await fetch(`/api/transfers/${deleteModal.transferId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete');
            toast.success('Transfer request deleted');
            router.push('/transfers');
            router.refresh();
          } catch {
            toast.error('Failed to delete transfer');
          } finally {
            setDeleteModal({ open: false, transferId: null, assetName: '' });
          }
        }}
        assetName={deleteModal.assetName}
      />
    </div>
  );
}