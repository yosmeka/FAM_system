'use client';

import React, { useState } from 'react';
import { X, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ChecklistItem {
  id: number;
  task: string;
  completed: boolean;
  completedAt?: string;
  notes?: string;
}

interface ManagerReviewModalProps {
  open: boolean;
  onClose: () => void;
  task: any;
  onReviewCompleted: () => void;
}

export default function ManagerReviewModal({
  open,
  onClose,
  task,
  onReviewCompleted
}: ManagerReviewModalProps) {
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);

  // Parse checklist items when task changes
  React.useEffect(() => {
    if (task?.checklistItems) {
      try {
        const items = JSON.parse(task.checklistItems);
        setChecklist(Array.isArray(items) ? items : []);
      } catch (e) {
        console.error('Failed to parse checklist:', e);
        setChecklist([]);
      }
    }
  }, [task]);

  const handleReview = async (action: 'approve' | 'reject') => {
    if (action === 'reject' && !reviewNotes.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/maintenance/${task.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          reviewNotes: reviewNotes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to review task');
      }

      const result = await response.json();
      toast.success(result.message);
      onReviewCompleted();
      onClose();
    } catch (error) {
      console.error('Error reviewing task:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to review task');
    } finally {
      setSubmitting(false);
    }
  };

  const completedItems = checklist.filter(item => item.completed).length;
  const progressPercentage = checklist.length > 0 ? (completedItems / checklist.length) * 100 : 0;

  if (!open || !task) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Review Maintenance Task
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
          {/* Task Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Task Details</h3>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Technician:</span> {task.assignedTo?.name}</p>
                <p><span className="font-medium">Priority:</span> {task.priority}</p>
                <p><span className="font-medium">Scheduled:</span> {new Date(task.scheduledDate).toLocaleDateString()}</p>
                <p><span className="font-medium">Completed:</span> {task.completedAt ? new Date(task.completedAt).toLocaleDateString() : 'N/A'}</p>
                {task.actualHours && (
                  <p><span className="font-medium">Actual Hours:</span> {task.actualHours}h</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Progress Summary</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Checklist Progress</span>
                    <span>{completedItems}/{checklist.length} items</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Checklist Review */}
          {checklist.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                Completed Checklist ({completedItems}/{checklist.length} completed)
              </h3>
              <div className="space-y-2">
                {checklist.map((item, index) => (
                  <div key={item.id || index} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
                      item.completed
                        ? 'bg-green-500 border-green-500'
                        : 'border-gray-400'
                    }`}>
                      {item.completed && <CheckCircle className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm ${
                        item.completed
                          ? 'text-gray-900 dark:text-white'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {item.task}
                      </p>
                      {item.completed && item.completedAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          Completed: {new Date(item.completedAt).toLocaleString()}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          Note: {item.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Technician Notes */}
          {task.notes && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Technician Notes</h3>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-900 dark:text-blue-100 whitespace-pre-wrap">
                  {task.notes}
                </p>
              </div>
            </div>
          )}

          {/* Review Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Review Notes (Required for rejection)
            </label>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Add your review comments..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => handleReview('reject')}
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" />
              {submitting ? 'Rejecting...' : 'Reject Task'}
            </button>

            <button
              onClick={() => handleReview('approve')}
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              {submitting ? 'Approving...' : 'Approve Task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
