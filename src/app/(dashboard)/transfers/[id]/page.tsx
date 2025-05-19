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
  managerReason?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
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
  document?: {
    id: string;
    url: string;
    fileName: string;
    type: string;
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
      // Fetch transfer details
      const response = await fetch(`/api/transfers/${id}`);
      if (!response.ok) throw new Error('Failed to fetch transfer details');
      const data = await response.json();

      // If transfer is approved or rejected, check for document
      if (data.status === 'APPROVED' || data.status === 'REJECTED') {
        try {
          console.log(`Fetching document for transfer ${id}`);
          const docResponse = await fetch(`/api/transfers/${id}/document`);

          if (docResponse.ok) {
            const docData = await docResponse.json();
            console.log(`Document data for transfer ${id}:`, docData);

            if (docData.documentUrl) {
              data.document = {
                id: `${data.id}-doc`,
                url: docData.documentUrl,
                fileName: `transfer_${data.status.toLowerCase()}_${data.id}.pdf`,
                type: data.status === 'APPROVED' ? 'TRANSFER_APPROVAL' : 'TRANSFER_REJECTION'
              };
              console.log(`Document found and set for transfer ${id}`);
            } else {
              console.log('Document URL not found in response:', docData);
            }
          } else {
            console.log(`Document not found for transfer ${id}, status: ${docResponse.status}`);
            // Try to get the error message
            try {
              const errorData = await docResponse.json();
              console.log(`Error details:`, errorData);
            } catch (e) {
              console.log(`Could not parse error response`);
            }
          }
        } catch (docError) {
          console.error('Error fetching document:', docError);
          // Continue even if document fetch fails
        }
      }

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
            <h3 className="font-medium">Request Reason</h3>
            <p className="text-gray-600">{transfer.reason}</p>
          </div>

          {transfer.managerReason && (
            <div>
              <h3 className="font-medium">
                {transfer.status === 'APPROVED' ? 'Approval Reason' : 'Rejection Reason'}
              </h3>
              <p className="text-gray-600">{transfer.managerReason}</p>
            </div>
          )}

          <div>
            <h3 className="font-medium">Request Date</h3>
            <p className="text-gray-600">
              {new Date(transfer.createdAt).toLocaleDateString()}
            </p>
          </div>

          {transfer.status !== 'PENDING' && (
            <div>
              <h3 className="font-medium">Response Date</h3>
              <p className="text-gray-600">
                {new Date(transfer.updatedAt).toLocaleDateString()}
              </p>
            </div>
          )}

          {/* Only show document section to the requester */}
          {session?.user?.id === transfer.requester?.id && transfer.document && (
            <div className="border-t pt-4 mt-4">
              <h3 className="font-medium mb-2 text-lg">Official Transfer Document</h3>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="bg-red-100 p-2 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-md">
                      {transfer.status === 'APPROVED' ? 'Transfer Approval Document' : 'Transfer Rejection Document'}
                    </h4>
                    <p className="text-sm text-gray-600">
                      This document serves as official proof of the transfer {transfer.status.toLowerCase()}.
                    </p>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500">
                    {transfer.status === 'APPROVED'
                      ? 'You can use this document as proof that your transfer request was approved.'
                      : 'This document contains the reason why your transfer request was rejected.'}
                  </p>
                  <a
                    href={transfer.document.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md flex items-center space-x-2 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Download Document</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Only show document not available message to the requester */}
          {session?.user?.id === transfer.requester?.id &&
           (transfer.status === 'APPROVED' || transfer.status === 'REJECTED') &&
           !transfer.document && (
            <div className="border-t pt-4 mt-4">
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <h3 className="font-medium text-yellow-800">Document Not Available</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  The transfer document is not available yet. Please check back later or contact your manager.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-4 pt-4">
            <RoleBasedButton
              variant="secondary"
              onClick={() => router.push('/transfers')}
            >
              Back to List
            </RoleBasedButton>
            {/* Only show All Documents button to the requester */}
            {session?.user?.id === transfer.requester?.id && transfer.document && (
              <RoleBasedButton
                variant="secondary"
                onClick={() => router.push('/transfers/documents')}
                className="flex items-center space-x-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>All My Documents</span>
              </RoleBasedButton>
            )}
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
