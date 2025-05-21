'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, X as XIcon, Download } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { MaintenanceStatus } from '@/types/maintenance';

interface MaintenanceApprovalModalProps {
  open: boolean;
  onClose: () => void;
  maintenanceId: string;
  assetId: string;
  description: string;
  priority: string;
  requesterName?: string;
  createdAt: string;
  onSuccess: () => void;
}

export function MaintenanceApprovalModal({
  open,
  onClose,
  maintenanceId,
  assetId,
  description,
  priority,
  requesterName,
  createdAt,
  onSuccess,
}: MaintenanceApprovalModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notes, setNotes] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [assetName, setAssetName] = useState('');
  const [assetSerialNumber, setAssetSerialNumber] = useState('');
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<MaintenanceStatus | null>(null);

  // Fetch maintenance request details when the modal opens
  useEffect(() => {
    if (open && maintenanceId) {
      fetchMaintenanceDetails();
    }
  }, [open, maintenanceId]);

  const fetchMaintenanceDetails = async () => {
    try {
      const response = await fetch(`/api/maintenance/${maintenanceId}`);
      if (!response.ok) throw new Error('Failed to fetch maintenance details');

      const data = await response.json();

      // Update state with fetched data
      setAssetName(data.asset?.name || '');
      setAssetSerialNumber(data.asset?.serialNumber || '');
      setStatus(data.status as MaintenanceStatus);

      // If there's a document URL, set it
      if (data.documentUrl) {
        setDocumentUrl(data.documentUrl);
      }

      // If there are notes, set them
      if (data.notes) {
        setNotes(data.notes);
      }

      // If there's a scheduled date, set it
      if (data.scheduledDate) {
        const date = new Date(data.scheduledDate);
        setScheduledDate(date.toISOString().split('T')[0]);
      }
    } catch (error) {
      console.error('Error fetching maintenance details:', error);
      toast.error('Failed to load maintenance details');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleApprove = async () => {
    if (!scheduledDate) {
      toast.error('Please select a scheduled date');
      return;
    }

    await updateMaintenanceStatus('APPROVED');
  };

  const handleReject = async () => {
    if (!notes) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    await updateMaintenanceStatus('REJECTED');
  };

  const updateMaintenanceStatus = async (status: MaintenanceStatus) => {
    try {
      setIsSubmitting(true);

      const payload = {
        status,
        notes,
        scheduledDate: status === 'APPROVED' ? scheduledDate : undefined,
      };

      const response = await fetch(`/api/maintenance/${maintenanceId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${status.toLowerCase()} maintenance request`);
      }

      toast.success(`Maintenance request ${status.toLowerCase()} successfully`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error(`Error ${status.toLowerCase()}ing maintenance request:`, error);
      toast.error(`Failed to ${status.toLowerCase()} maintenance request`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black bg-opacity-30" onClick={onClose}></div>

        {/* Modal */}
        <div className="relative z-10 w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
          {/* Close button */}
          <div className="absolute right-0 top-0 pr-4 pt-4">
            <button
              type="button"
              className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <X className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>

          {/* Header with title and buttons */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Maintenance Request Details</h2>
            <div className="flex items-center gap-3">
              {status === 'APPROVED' && documentUrl && (
                <a
                  href={documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-red-600 hover:text-red-800"
                >
                  <Download size={16} />
                  <span>Download</span>
                </a>
              )}
              {status && (
                <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                  status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                  status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                  status === 'PENDING_APPROVAL' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {status}
                </span>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="bg-white shadow rounded-lg p-6 space-y-4">
            <div>
              <h3 className="font-medium">Asset Information</h3>
              <p className="text-gray-600">
                {assetName} {assetSerialNumber ? `(${assetSerialNumber})` : ''}
              </p>
            </div>

            <div>
              <h3 className="font-medium">Description</h3>
              <p className="text-gray-600">{description}</p>
            </div>

            <div>
              <h3 className="font-medium">Requested By</h3>
              <p className="text-gray-600">{requesterName || 'Unknown'}</p>
            </div>

            <div>
              <h3 className="font-medium">Request Date</h3>
              <p className="text-gray-600">{formatDate(createdAt)}</p>
            </div>

            {/* Only show scheduled date input if not already approved or rejected */}
            {(!status || status === 'PENDING_APPROVAL') && (
              <div>
                <h3 className="font-medium">Scheduled Date (required for approval)</h3>
                <input
                  type="date"
                  id="scheduledDate"
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2 focus:border-blue-500 focus:ring-blue-500"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            )}

            {/* Show scheduled date if already set */}
            {status && status !== 'PENDING_APPROVAL' && scheduledDate && (
              <div>
                <h3 className="font-medium">Scheduled Date</h3>
                <p className="text-gray-600">{formatDate(scheduledDate)}</p>
              </div>
            )}

            {/* Notes field - editable if pending, read-only if approved/rejected */}
            <div>
              <h3 className="font-medium">Notes {status === 'PENDING_APPROVAL' && '(required for rejection)'}</h3>
              {status && status !== 'PENDING_APPROVAL' ? (
                <p className="text-gray-600 p-3 bg-gray-50 border border-gray-100 rounded-md mt-1">
                  {notes || 'No notes provided.'}
                </p>
              ) : (
                <textarea
                  id="notes"
                  rows={3}
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Provide additional information or reason for rejection"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              )}
            </div>

            {/* Document section for approved/rejected requests */}
            {status && (status === 'APPROVED' || status === 'REJECTED') && documentUrl && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h3 className="font-medium">Document</h3>
                <div className="mt-2">
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="p-6">
                      <div className="flex items-start">
                        <div className="flex-shrink-0 bg-red-100 rounded-full p-3">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="ml-4">
                          <h3 className="text-lg font-medium text-gray-900">
                            Maintenance {status === 'APPROVED' ? 'Approval' : 'Rejection'} Document
                          </h3>
                          <p className="mt-1 text-sm text-gray-600">
                            This document serves as official proof of the maintenance request {status.toLowerCase()}.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end p-4 border-t border-gray-200">
                      <a
                        href={documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <Download className="h-5 w-5 mr-2" />
                        Download Document
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action buttons - only show if pending approval */}
            {(!status || status === 'PENDING_APPROVAL') && (
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 mt-4">
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={isSubmitting}
                  className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  <XIcon size={16} className="mr-2" />
                  Reject
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isSubmitting}
                  className="inline-flex justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  <Check size={16} className="mr-2" />
                  Approve
                </button>
              </div>
            )}

            {/* Back to list button for approved/rejected requests */}
            {status && status !== 'PENDING_APPROVAL' && (
              <div className="flex justify-center space-x-4 pt-4 border-t border-gray-200 mt-4">
                <button
                  onClick={onClose}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Back to List
                </button>
                {status === 'APPROVED' && (
                  <button
                    onClick={onClose}
                    className="inline-flex items-center px-4 py-2 border border-blue-300 shadow-sm text-sm font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Schedule Maintenance
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
