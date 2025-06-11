'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { X, CheckCircle, XCircle, User, Calendar, Clock, AlertTriangle } from 'lucide-react';

interface MaintenanceRequest {
  id: string;
  description: string;
  priority: string;
  status: string;
  createdAt: string;
  maintenanceType: string;
  issueType?: string;
  urgencyLevel?: string;
  assetDowntime: boolean;
  impactDescription?: string;
  notes?: string;
  asset: {
    name: string;
    serialNumber: string;
    location: string;
  };
  requester: {
    name: string;
    email: string;
  };
}

interface RequestApprovalModalProps {
  open: boolean;
  onClose: () => void;
  request: MaintenanceRequest | null;
  onRequestProcessed: () => void;
}

export default function RequestApprovalModal({
  open,
  onClose,
  request,
  onRequestProcessed
}: RequestApprovalModalProps) {
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [assignedToId, setAssignedToId] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [managerNotes, setManagerNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);

  useEffect(() => {
    if (open && request) {
      fetchTechnicians();
      // Set default scheduled date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setScheduledDate(tomorrow.toISOString().split('T')[0]);
    }
  }, [open, request]);

  const fetchTechnicians = async () => {
    try {
      const response = await fetch('/api/users?role=USER');
      if (response.ok) {
        const data = await response.json();
        setTechnicians(data);
      }
    } catch (error) {
      console.error('Error fetching technicians:', error);
    }
  };

  const handleApprove = async () => {
    if (!assignedToId) {
      toast.error('Please assign a technician');
      return;
    }

    if (!scheduledDate) {
      toast.error('Please set a scheduled date');
      return;
    }

    try {
      setSubmitting(true);

      const updateData = {
        status: 'APPROVED',
        assignedToId,
        scheduledDate: new Date(scheduledDate).toISOString(),
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined,
        notes: managerNotes ? `Manager Notes: ${managerNotes}${request?.notes ? `\n\nOriginal Notes: ${request.notes}` : ''}` : request?.notes,
      };

      const response = await fetch(`/api/maintenance/${request?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) throw new Error('Failed to approve request');

      toast.success('Maintenance request approved and assigned!');
      onRequestProcessed();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Failed to approve request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!managerNotes.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      setSubmitting(true);

      const updateData = {
        status: 'REJECTED',
        notes: `Request rejected by manager: ${managerNotes}${request?.notes ? `\n\nOriginal Notes: ${request.notes}` : ''}`,
      };

      const response = await fetch(`/api/maintenance/${request?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) throw new Error('Failed to reject request');

      toast.success('Maintenance request rejected');
      onRequestProcessed();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject request');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setAssignedToId('');
    setScheduledDate('');
    setEstimatedHours('');
    setManagerNotes('');
    setAction(null);
  };

  if (!open || !request) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Review Maintenance Request
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {request.asset.name} ({request.asset.serialNumber})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Request Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Request Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span><strong>Reported by:</strong> {request.requester.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span><strong>Date:</strong> {new Date(request.createdAt).toLocaleDateString()}</span>
                </div>
                {request.issueType && (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-gray-500" />
                    <span><strong>Issue Type:</strong> {request.issueType}</span>
                  </div>
                )}
                {request.urgencyLevel && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span><strong>Urgency:</strong> {request.urgencyLevel}</span>
                  </div>
                )}
                <div>
                  <span><strong>Priority:</strong> {request.priority}</span>
                </div>
                {request.assetDowntime && (
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="w-4 h-4" />
                    <span><strong>Asset is currently down</strong></span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Asset Information</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Name:</strong> {request.asset.name}</p>
                <p><strong>Serial Number:</strong> {request.asset.serialNumber}</p>
                <p><strong>Location:</strong> {request.asset.location}</p>
              </div>
            </div>
          </div>

          {/* Issue Description */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Issue Description</h3>
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                {request.description}
              </p>
            </div>
          </div>

          {/* Impact Description */}
          {request.impactDescription && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Operational Impact</h3>
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-600/30 rounded-lg">
                <p className="text-sm text-yellow-900 dark:text-yellow-100 whitespace-pre-wrap">
                  {request.impactDescription}
                </p>
              </div>
            </div>
          )}

          {/* Approval Section */}
          {!action && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Manager Decision</h3>
              <div className="flex gap-3">
                <button
                  onClick={() => setAction('approve')}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve Request
                </button>
                <button
                  onClick={() => setAction('reject')}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <XCircle className="w-4 h-4" />
                  Reject Request
                </button>
              </div>
            </div>
          )}

          {/* Approval Form */}
          {action === 'approve' && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-600/30 rounded-lg">
              <h3 className="text-lg font-medium text-green-900 dark:text-green-100 mb-3">Approve and Assign</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-green-900 dark:text-green-100 mb-2">
                    Assign to Technician <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={assignedToId}
                    onChange={(e) => setAssignedToId(e.target.value)}
                    className="w-full px-3 py-2 border border-green-300 dark:border-green-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    required
                  >
                    <option value="">Select a technician...</option>
                      <option key={request.requester.name} value={request.requester.name}>
                        {request.requester.name} ({request.requester.email})
                      </option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-green-900 dark:text-green-100 mb-2">
                    Scheduled Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-3 py-2 border border-green-300 dark:border-green-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-green-900 dark:text-green-100 mb-2">
                  Estimated Hours
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  className="w-full px-3 py-2 border border-green-300 dark:border-green-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., 2.5"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-green-900 dark:text-green-100 mb-2">
                  Manager Notes
                </label>
                <textarea
                  value={managerNotes}
                  onChange={(e) => setManagerNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-green-300 dark:border-green-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Add any instructions or notes for the technician..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setAction(null)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprove}
                  disabled={submitting}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  {submitting ? 'Approving...' : 'Approve & Assign'}
                </button>
              </div>
            </div>
          )}

          {/* Rejection Form */}
          {action === 'reject' && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-600/30 rounded-lg">
              <h3 className="text-lg font-medium text-red-900 dark:text-red-100 mb-3">Reject Request</h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-red-900 dark:text-red-100 mb-2">
                  Reason for Rejection <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={managerNotes}
                  onChange={(e) => setManagerNotes(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-red-300 dark:border-red-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Please provide a clear reason for rejecting this request..."
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setAction(null)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={submitting}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  {submitting ? 'Rejecting...' : 'Reject Request'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
