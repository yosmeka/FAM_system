'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { RoleBasedButton } from '@/components/ui/RoleBasedButton';
import { toast } from 'react-hot-toast';

interface TransferDocument {
  id: string;
  transferId: string;
  assetName: string;
  status: string;
  url: string;
  createdAt: string;
  type: string;
}

export default function TransferDocumentsPage() {
  const { data: session, status } = useSession();
  const [documents, setDocuments] = useState<TransferDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Redirect if not authenticated or not a USER
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (session && session.user && session.user.role !== 'USER') {
      router.push('/transfers');
      toast.error('Only requesters can access transfer documents');
    }
  }, [session, status, router]);

  useEffect(() => {
    fetchDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      // First, fetch all transfers for the user
      const transfersResponse = await fetch('/api/transfers');
      if (!transfersResponse.ok) throw new Error('Failed to fetch transfers');
      const transfersData = await transfersResponse.json();

      // Filter only approved, rejected, or completed transfers that belong to the current user
      const relevantTransfers = transfersData.filter(
        (transfer: Record<string, unknown>) =>
          (transfer.status === 'APPROVED' || transfer.status === 'REJECTED' || transfer.status === 'COMPLETED') &&
          ((transfer.requester && (transfer.requester as { id?: string }).id === session?.user?.id) || transfer.requesterId === session?.user?.id)
      );

      // For each relevant transfer, check if it has a document
      const documentsPromises = relevantTransfers.map(async (transfer: Record<string, unknown>) => {
        try {
          const docResponse = await fetch(`/api/transfers/${transfer.id}/document`);
          if (!docResponse.ok) {
            return null;
          }
          const docData = await docResponse.json();
          if (!docData.documentUrl) {
            return null;
          }
          return {
            id: `${transfer.id}-doc`,
            transferId: transfer.id as string,
            assetName: transfer.asset && (transfer.asset as { name?: string }).name || 'Unknown Asset',
            status: transfer.status === 'COMPLETED' ? 'APPROVED' : transfer.status,
            url: docData.documentUrl,
            createdAt: (transfer.updatedAt || transfer.createdAt) as string,
            type: transfer.status === 'APPROVED' || transfer.status === 'COMPLETED' ? 'TRANSFER_APPROVAL' : 'TRANSFER_REJECTION'
          };
        } catch {
          return null;
        }
      });

      const results = await Promise.all(documentsPromises);
      const validDocuments = results.filter(doc => doc !== null) as TransferDocument[];

      // Sort by date (newest first)
      validDocuments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setDocuments(validDocuments);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load transfer documents');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">My Transfer Documents</h1>
        <RoleBasedButton
          variant="secondary"
          onClick={() => router.push('/transfers')}
        >
          Back to Transfers
        </RoleBasedButton>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
        </div>
      ) : documents.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-8 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h2 className="text-xl font-medium text-gray-600 dark:text-gray-500 mb-2">No Documents Found</h2>
          <p className="text-gray-500 mb-4">
            You don&apos;t have any transfer documents yet. Documents are automatically generated when your transfer requests are approved or rejected by a manager.
          </p>
          <RoleBasedButton
            variant="primary"
            onClick={() => router.push('/transfers/new')}
          >
            Create a Transfer Request
          </RoleBasedButton>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc) => (
            <div key={doc.id} className="bg-white rounded-lg shadow-md dark:bg-gray-900 overflow-hidden">
              <div className={`p-4 ${doc.status === 'APPROVED' ? 'bg-green-50 dark:bg-gray-900' : 'bg-red-50 dark:bg-gray-900'}`}>
                <div className="flex items-center space-x-3 dark:bg-gray-900">
                  <div className={`p-2 rounded-full ${doc.status === 'APPROVED' ? 'bg-green-100' : 'bg-red-100'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${doc.status === 'APPROVED' ? 'text-green-500' : 'text-red-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium">
                      {doc.status === 'APPROVED' ? 'Approval Document' : 'Rejection Document'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <h4 className="font-medium mb-2">Asset: {doc.assetName}</h4>
                <p className="text-sm text-gray-600 mb-4">
                  This document serves as official proof of the transfer {doc.status.toLowerCase()}.
                </p>
                <div className="flex justify-between items-center">
                  <RoleBasedButton
                    variant="secondary"
                    onClick={() => router.push(`/transfers/${doc.transferId}`)}
                    size="sm"
                  >
                    View Details
                  </RoleBasedButton>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 text-red-600 hover:text-red-800"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Download</span>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
