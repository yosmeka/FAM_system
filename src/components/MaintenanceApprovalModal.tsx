'use client';

import React, { useState } from 'react';
import { X, Check, X as XIcon } from 'lucide-react';
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
        <div className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
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

          {/* Content */}
          <div>
            <div className="mt-3 text-center sm:mt-0 sm:text-left">
              <h3 className="text-lg font-semibold leading-6 text-gray-900">
                Maintenance Request Approval
              </h3>
              
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Description</p>
                  <p className="mt-1">{description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Priority</p>
                    <p className="mt-1">{priority}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Requested By</p>
                    <p className="mt-1">{requesterName || 'Unknown'}</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500">Requested On</p>
                  <p className="mt-1">{formatDate(createdAt)}</p>
                </div>
                
                <div>
                  <label htmlFor="scheduledDate" className="block text-sm font-medium text-gray-700">
                    Schedule Date (if approved) *
                  </label>
                  <input
                    type="date"
                    id="scheduledDate"
                    className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2 focus:border-blue-500 focus:ring-blue-500"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                    Notes (required for rejection)
                  </label>
                  <textarea
                    id="notes"
                    rows={3}
                    className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2 focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Provide additional information or reason for rejection"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
