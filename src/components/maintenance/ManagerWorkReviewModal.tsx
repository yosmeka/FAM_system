'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { X, CheckCircle, XCircle, Clock, User, Calendar } from 'lucide-react';

interface ManagerWorkReviewModalProps {
  open: boolean;
  onClose: () => void;
  task: any;
  onReviewCompleted: () => void;
}

export default function ManagerWorkReviewModal({
  open,
  onClose,
  task,
  onReviewCompleted
}: ManagerWorkReviewModalProps) {
  const [managerReviewNotes, setManagerReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setManagerReviewNotes('');
      setAction(null);
      setSubmitting(false);
    }
  }, [open]);

  const handleApprove = async () => {
    try {
      setSubmitting(true);

      const payload = {
        status: 'COMPLETED',
        managerReviewNotes: managerReviewNotes.trim() || undefined,
        finalApprovedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };

      const response = await fetch(`/api/maintenance/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to approve work');
      }

      toast.success('Work approved and maintenance completed!');
      onReviewCompleted();
      onClose();

    } catch (error) {
      console.error('Error approving work:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to approve work');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!managerReviewNotes.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        status: 'IN_PROGRESS', // Send back to technician for rework
        managerReviewNotes: `Work rejected: ${managerReviewNotes.trim()}`,
      };

      const response = await fetch(`/api/maintenance/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reject work');
      }

      toast.success('Work rejected and sent back to technician');
      onReviewCompleted();
      onClose();

    } catch (error) {
      console.error('Error rejecting work:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reject work');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !task) return null;

  // Parse parts used
  let partsUsed = [];
  if (task.partsUsed) {
    try {
      partsUsed = JSON.parse(task.partsUsed);
    } catch (e) {
      partsUsed = [];
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Review Completed Work
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {task.asset?.name} ({task.asset?.serialNumber})
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
          {/* Work Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Work Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span><strong>Technician:</strong> {task.assignedTo?.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span><strong>Started:</strong> {task.workStartedAt ? new Date(task.workStartedAt).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span><strong>Completed:</strong> {task.workCompletedAt ? new Date(task.workCompletedAt).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span><strong>Labor Hours:</strong> {task.laborHours || 0}h</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Cost Breakdown</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Labor Cost:</span>
                  <span className="font-medium">${(task.laborCost || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Parts Cost:</span>
                  <span className="font-medium">${(task.partsCost || 0).toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-600 pt-2 flex justify-between text-lg font-semibold">
                  <span>Total Cost:</span>
                  <span>${(task.totalCost || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Work Performed */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Work Performed</h3>
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                {task.workPerformed || 'No work description provided'}
              </p>
            </div>
          </div>

          {/* Parts Used */}
          {partsUsed.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Parts/Materials Used</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-600">
                      <th className="text-left py-2">Part Name</th>
                      <th className="text-center py-2">Quantity</th>
                      <th className="text-right py-2">Unit Cost</th>
                      <th className="text-right py-2">Total Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partsUsed.map((part: any, index: number) => (
                      <tr key={index} className="border-b border-gray-100 dark:border-gray-700">
                        <td className="py-2">{part.name}</td>
                        <td className="text-center py-2">{part.quantity}</td>
                        <td className="text-right py-2">${part.unitCost.toFixed(2)}</td>
                        <td className="text-right py-2">${part.totalCost.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Technician Notes */}
          {task.technicianNotes && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Technician Notes</h3>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-600/30 rounded-lg">
                <p className="text-sm text-blue-900 dark:text-blue-100 whitespace-pre-wrap">
                  {task.technicianNotes}
                </p>
              </div>
            </div>
          )}

          {/* Manager Decision */}
          {!action && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Manager Decision</h3>
              <div className="flex gap-3">
                <button
                  onClick={() => setAction('approve')}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve Work
                </button>
                <button
                  onClick={() => setAction('reject')}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <XCircle className="w-4 h-4" />
                  Reject Work
                </button>
              </div>
            </div>
          )}

          {/* Approval Form */}
          {action === 'approve' && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-600/30 rounded-lg">
              <h3 className="text-lg font-medium text-green-900 dark:text-green-100 mb-3">Approve Work</h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-green-900 dark:text-green-100 mb-2">
                  Approval Notes (Optional)
                </label>
                <textarea
                  value={managerReviewNotes}
                  onChange={(e) => setManagerReviewNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-green-300 dark:border-green-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Add any comments about the completed work..."
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
                  {submitting ? 'Approving...' : 'Approve & Complete'}
                </button>
              </div>
            </div>
          )}

          {/* Rejection Form */}
          {action === 'reject' && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-600/30 rounded-lg">
              <h3 className="text-lg font-medium text-red-900 dark:text-red-100 mb-3">Reject Work</h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-red-900 dark:text-red-100 mb-2">
                  Reason for Rejection <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={managerReviewNotes}
                  onChange={(e) => setManagerReviewNotes(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-red-300 dark:border-red-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Please provide specific feedback on what needs to be corrected..."
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
                  {submitting ? 'Rejecting...' : 'Reject & Send Back'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
