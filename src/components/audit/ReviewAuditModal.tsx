'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { X, CheckCircle, XCircle, AlertTriangle, MapPin, Clock, User } from 'lucide-react';
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface AuditData {
  id: string;
  auditDate: string;
  condition: string;
  locationVerified: boolean;
  actualLocation?: string;
  notes: string;
  discrepancies?: string;
  recommendations?: string;
  checklistItems?: Array<{
    item: string;
    checked: boolean;
    notes?: string;
  }>;
  auditorId: string;
  auditor?: {
    name: string;
    email: string;
  };
  asset: {
    id: string;
    name: string;
    serialNumber: string;
    location: string;
  };
}

interface ReviewAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  audit: AuditData;
  assignmentId?: string;
  requestId?: string;
}

export default function ReviewAuditModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  audit, 
  assignmentId, 
  requestId 
}: ReviewAuditModalProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (reviewAction === 'reject' && !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/audits/workflow', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          auditId: audit.id,
          action: reviewAction,
          reviewNotes: reviewNotes.trim() || undefined,
          rejectionReason: reviewAction === 'reject' ? rejectionReason.trim() : undefined,
        }),
      });

      if (response.ok) {
        toast.success(`Audit ${reviewAction}d successfully!`);
        onSuccess();
        onClose();
        resetForm();
      } else {
        const error = await response.json();
        toast.error(error.error || `Failed to ${reviewAction} audit`);
      }
    } catch (error) {
      console.error(`Error ${reviewAction}ing audit:`, error);
      toast.error(`Failed to ${reviewAction} audit`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setReviewAction('approve');
    setReviewNotes('');
    setRejectionReason('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'EXCELLENT':
        return 'text-green-600 bg-green-100';
      case 'GOOD':
        return 'text-green-500 bg-green-50';
      case 'FAIR':
        return 'text-yellow-500 bg-yellow-50';
      case 'POOR':
        return 'text-orange-500 bg-orange-50';
      case 'CRITICAL':
        return 'text-red-500 bg-red-50';
      default:
        return 'text-gray-500 bg-gray-50';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-600">
          <div>
            <h2 className="text-xl font-semibold dark:text-white">Review Audit</h2>
            <p className="text-gray-400 dark:text-gray-300">{audit.asset.name} - {audit.asset.serialNumber}</p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-red-500 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Audit Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-200 dark:bg-gray-700 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-blue-400" />
                <span className="text-gray-600 dark:text-gray-300">Audit Date</span>
              </div>
              <p className="text-gray-800 font-medium dark:text-white">{formatDate(audit.auditDate)}</p>
            </div>
            
            <div className="p-4 bg-gray-200 dark:bg-gray-700 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-5 w-5 text-green-400" />
                <span className="text-gray-600 dark:text-gray-300">Auditor</span>
              </div>
              <p className="text-gray-800 font-medium dark:text-white">{audit.auditor?.name || 'Unknown'}</p>
              <p className="text-sm text-gray-400">{audit.auditor?.email}</p>
            </div>
            
            <div className="p-4 bg-gray-200 dark:bg-gray-700 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
                <span className="text-gray-600 dark:text-gray-300">Condition</span>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getConditionColor(audit.condition)}`}>
                {audit.condition}
              </span>
            </div>
          </div>

          {/* Location Verification */}
          <div className="p-4 bg-gray-200 dark:bg-gray-700 rounded-md">
            <h3 className="text-lg font-medium dark:text-white mb-3 flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Location Verification
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-gray-700 dark:text-gray-300">Recorded Location:</span>
                <p className="dark:text-white text-gray-700">{audit.asset.location}</p>
              </div>
              <div>
                <span className="text-gray-700 dark:text-gray-300">Location Verified:</span>
                <div className="flex items-center gap-2 mt-1">
                  {audit.locationVerified ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span className={audit.locationVerified ? 'text-green-400' : 'text-red-400'}>
                    {audit.locationVerified ? 'Yes' : 'No'}
                  </span>
                </div>
                {!audit.locationVerified && audit.actualLocation && (
                  <p className="dark:text-white text-gray-700 mt-1">
                    <span className="text-gray-400">Found at:</span> {audit.actualLocation}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Audit Checklist */}
          {audit.checklistItems && audit.checklistItems.length > 0 && (
            <div className="p-4 bg-gray-200 dark:bg-gray-700 rounded-md">
              <h3 className="text-lg font-medium dark:text-white mb-3">Audit Checklist</h3>
              <div className="space-y-3">
                {audit.checklistItems.map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="mt-1">
                      {item.checked ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${item.checked ? 'text-green-400' : 'text-red-400'}`}>
                        {item.item}
                      </p>
                      {item.notes && (
                        <p className="text-sm text-gray-300 mt-1">{item.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audit Notes */}
          <div className="p-4 bg-gray-200 dark:bg-gray-700 rounded-md">
            <h3 className="text-lg font-medium dark:text-white mb-3">Audit Notes</h3>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{audit.notes}</p>
          </div>

          {/* Discrepancies */}
          {audit.discrepancies && (
            <div className="p-4 bg-red-900 bg-opacity-50 border border-red-600 rounded-md">
              <h3 className="text-lg font-medium dark:text-red-200 mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Discrepancies Found
              </h3>
              <p className="text-red-100 dark:text-red-200 whitespace-pre-wrap">{audit.discrepancies}</p>
            </div>
          )}

          {/* Recommendations */}
          {audit.recommendations && (
            <div className="p-4 bg-blue-900 bg-opacity-50 border border-blue-600 rounded-md">
              <h3 className="text-lg font-medium dark:text-blue-200 mb-3">Recommendations</h3>
              <p className="text-blue-100 dark:text-blue-200 whitespace-pre-wrap">{audit.recommendations}</p>
            </div>
          )}

          {/* Review Form */}
          <form onSubmit={handleSubmit} className="p-4 bg-gray-200 dark:bg-gray-700 rounded-md">
            <h3 className="text-lg font-medium dark:text-white mb-4">Manager Review</h3>
            
            <div className="space-y-4">
              {/* Review Action */}
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                  Review Decision *
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="approve"
                      checked={reviewAction === 'approve'}
                      onChange={(e) => setReviewAction(e.target.value as 'approve' | 'reject')}
                      className="mr-2"
                    />
                    <span className="text-green-400">Approve Audit</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="reject"
                      checked={reviewAction === 'reject'}
                      onChange={(e) => setReviewAction(e.target.value as 'approve' | 'reject')}
                      className="mr-2"
                    />
                    <span className="text-red-400">Reject Audit</span>
                  </label>
                </div>
              </div>

              {/* Review Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                  Review Notes {reviewAction === 'approve' ? '(Optional)' : ''}
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                  placeholder="Add any notes about your review..."
                  className="w-full px-3 py-2 border border-gray-600 rounded-md dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Rejection Reason */}
              {reviewAction === 'reject' && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                    Rejection Reason *
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    placeholder="Please explain why this audit is being rejected..."
                    className="w-full px-3 py-2 border border-gray-600 rounded-md dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              )}

              {/* Submit Actions */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-6 py-2 text-white dark:text-white rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center gap-2 ${
                    reviewAction === 'approve' ? 'bg-green-600' : 'bg-red-600'
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      {reviewAction === 'approve' ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      {reviewAction === 'approve' ? 'Approve Audit' : 'Reject Audit'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}
