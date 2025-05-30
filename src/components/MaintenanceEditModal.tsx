'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { MaintenanceStatus, MaintenancePriority } from '@/types/maintenance';
import { useRole } from '@/hooks/useRole';

interface MaintenanceEditModalProps {
  open: boolean;
  onClose: () => void;
  maintenanceId: string;
  initialData: {
    description: string;
    priority: MaintenancePriority;
    status: MaintenanceStatus;
    notes?: string;
    scheduledDate?: string;
    managerId?: string;
  };
  onSuccess: () => void;
}

export function MaintenanceEditModal({
  open,
  onClose,
  maintenanceId,
  initialData,
  onSuccess,
}: MaintenanceEditModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [description, setDescription] = useState(initialData.description);
  const [priority, setPriority] = useState<MaintenancePriority>(initialData.priority);
  const [status, setStatus] = useState<MaintenanceStatus>(initialData.status);
  const [notes, setNotes] = useState(initialData.notes || '');
  const [managerId, setManagerId] = useState(initialData.managerId || '');
  const [managers, setManagers] = useState<Array<{id: string, name: string, email: string}>>([]);
  const [scheduledDate, setScheduledDate] = useState(
    initialData.scheduledDate
      ? new Date(initialData.scheduledDate).toISOString().split('T')[0]
      : ''
  );

  const { isManager, isAdmin, isUser } = useRole();
  const isPendingApproval = initialData.status === 'PENDING_APPROVAL';
  const isApproved = initialData.status === 'APPROVED';
  const canEditStatus = isManager() || isAdmin() || (isUser() && isApproved);

  // Fetch managers when component mounts
  useEffect(() => {
    const fetchManagers = async () => {
      try {
        const response = await fetch('/api/users/managers');
        if (response.ok) {
          const data = await response.json();
          setManagers(data);
        }
      } catch (error) {
        console.error('Error fetching managers:', error);
      }
    };

    fetchManagers();
  }, []);

  // Update form when initialData changes
  useEffect(() => {
    setDescription(initialData.description);
    setPriority(initialData.priority);
    setStatus(initialData.status);
    setNotes(initialData.notes || '');
    setManagerId(initialData.managerId || '');
    setScheduledDate(
      initialData.scheduledDate
        ? new Date(initialData.scheduledDate).toISOString().split('T')[0]
        : ''
    );
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);

      const payload: any = {
        description,
        priority,
        notes,
        managerId: managerId || undefined,
      };

      // Store the original status for comparison
      const originalStatus = initialData.status;

      // Handle status based on user role and request state
      if (isUser() && isPendingApproval) {
        // For regular users with pending requests, always keep status as PENDING_APPROVAL
        payload.status = 'PENDING_APPROVAL';
      } else if (isUser() && !isApproved && !canEditStatus) {
        // For regular users with non-approved requests that aren't pending, keep the original status
        payload.status = initialData.status;
      } else {
        // For managers/admins or users with approved requests, use the selected status
        payload.status = status;
      }

      // Include scheduled date if provided
      if (scheduledDate) {
        payload.scheduledDate = scheduledDate;
      }

      // Add a flag to indicate if a notification should be sent to the manager
      // This happens when a user changes the status of an approved request
      const shouldNotifyManager = isUser() &&
                                 isApproved &&
                                 originalStatus !== payload.status &&
                                 payload.status !== 'APPROVED';

      if (shouldNotifyManager) {
        payload.notifyManager = true;
        payload.previousStatus = originalStatus;
      }

      const response = await fetch(`/api/maintenance/${maintenanceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to update maintenance request');
      }

      toast.success('Maintenance request updated successfully');

      // Show additional toast if notification was sent to manager
      if (shouldNotifyManager) {
        toast.success('Manager has been notified of the status change');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating maintenance request:', error);
      toast.error('Failed to update maintenance request');
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
                Edit Maintenance Request
              </h3>

              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description *
                  </label>
                  <textarea
                    id="description"
                    rows={3}
                    className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2 focus:border-blue-500 focus:ring-blue-500"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                      Priority *
                    </label>
                    <select
                      id="priority"
                      className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2 focus:border-blue-500 focus:ring-blue-500"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as MaintenancePriority)}
                      required
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="managerId" className="block text-sm font-medium text-gray-700">
                      Assign to Manager
                    </label>
                    <select
                      id="managerId"
                      className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2 focus:border-blue-500 focus:ring-blue-500"
                      value={managerId}
                      onChange={(e) => setManagerId(e.target.value)}
                    >
                      <option value="">Select a manager</option>
                      {managers.map((manager) => (
                        <option key={manager.id} value={manager.id}>
                          {manager.name} ({manager.email})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Status field - always shown but conditionally editable */}
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                    Status *
                  </label>
                  {isUser() && isPendingApproval ? (
                    <>
                      <select
                        id="status"
                        className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2 bg-gray-100 focus:border-blue-500 focus:ring-blue-500"
                        value={status}
                        disabled={true}
                        required
                      >
                        <option value="PENDING_APPROVAL">Pending Approval</option>
                      </select>
                      <p className="text-sm text-yellow-700 mt-1">
                        You will be able to update the status after it has been approved by a manager.
                      </p>
                    </>
                  ) : (
                    <>
                      <select
                        id="status"
                        className={`mt-1 block w-full rounded-md border ${canEditStatus ? 'border-green-300' : 'border-gray-300'} shadow-sm p-2 focus:border-blue-500 focus:ring-blue-500 ${!canEditStatus ? 'bg-gray-100' : ''}`}
                        value={status}
                        onChange={(e) => setStatus(e.target.value as MaintenanceStatus)}
                        required
                        disabled={!canEditStatus}
                      >
                        <option value="PENDING_APPROVAL">Pending Approval</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                        <option value="SCHEDULED">Scheduled</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                      {isUser() && isApproved && (
                        <p className="text-sm text-green-700 mt-1">
                          This request has been approved. You can now update its status.
                        </p>
                      )}
                      {isUser() && !isApproved && !isPendingApproval && (
                        <p className="text-sm text-gray-700 mt-1">
                          Status can only be edited by managers or for approved requests.
                        </p>
                      )}
                    </>
                  )}
                </div>

                <div>
                  <label htmlFor="scheduledDate" className="block text-sm font-medium text-gray-700">
                    Scheduled Date
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
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    rows={3}
                    className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2 focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Provide additional information"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
