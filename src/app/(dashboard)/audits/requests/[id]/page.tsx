'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Edit,
  Trash2,
  MessageSquare
} from 'lucide-react';
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface AuditRequest {
  id: string;
  title: string;
  reason: string;
  urgency: string;
  requestedDate: string;
  status: string;
  description?: string;
  expectedFindings?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  rejectionReason?: string;
  asset: {
    id: string;
    name: string;
    serialNumber: string;
    department: string;
    category: string;
    location: string;
  };
  requester: {
    id: string;
    name: string;
    email: string;
  };
  manager?: {
    id: string;
    name: string;
    email: string;
  };
  audits?: Array<{
    id: string;
    status: string;
    workflowStatus: string;
    auditDate: string;
    condition: string;
  }>;
}

export default function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [request, setRequest] = useState<AuditRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [requestId, setRequestId] = useState<string | null>(null);

  useEffect(() => {
    const initializeParams = async () => {
      const { id } = await params;
      setRequestId(id);
    };
    initializeParams();
  }, [params]);

  useEffect(() => {
    if (requestId) {
      fetchRequest();
    }
  }, [requestId]);

  const fetchRequest = async () => {
    if (!requestId) return;

    try {
      const response = await fetch(`/api/audit-requests/${requestId}`);
      if (response.ok) {
        const data = await response.json();
        setRequest(data);
      } else {
        toast.error('Request not found');
        router.push('/audits/workflow');
      }
    } catch (error) {
      console.error('Error fetching request:', error);
      toast.error('Failed to load request');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async () => {
    if (!request) return;

    if (reviewAction === 'reject' && !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`/api/audit-requests/${request.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: reviewAction,
          reviewNotes: reviewNotes.trim() || undefined,
          rejectionReason: reviewAction === 'reject' ? rejectionReason.trim() : undefined,
        }),
      });

      if (response.ok) {
        const updatedRequest = await response.json();
        setRequest(updatedRequest);
        setShowReviewForm(false);
        setReviewNotes('');
        setRejectionReason('');
        toast.success(`Request ${reviewAction}d successfully!`);
      } else {
        const error = await response.json();
        toast.error(error.error || `Failed to ${reviewAction} request`);
      }
    } catch (error) {
      console.error(`Error ${reviewAction}ing request:`, error);
      toast.error(`Failed to ${reviewAction} request`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleClaim = async () => {
    if (!request) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/audit-requests/${request.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'claim',
        }),
      });

      if (response.ok) {
        const updatedRequest = await response.json();
        setRequest(updatedRequest);
        toast.success('Request claimed successfully!');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to claim request');
      }
    } catch (error) {
      console.error('Error claiming request:', error);
      toast.error('Failed to claim request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!request) return;

    if (!confirm('Are you sure you want to delete this request? This action cannot be undone.')) {
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`/api/audit-requests/${request.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Request deleted successfully!');
        router.push('/audits/workflow');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete request');
      }
    } catch (error) {
      console.error('Error deleting request:', error);
      toast.error('Failed to delete request');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'REJECTED':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'PENDING_APPROVAL':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'PENDING_APPROVAL':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'LOW':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const canUserTakeAction = () => {
    if (!session?.user || !request) return false;

    const userRole = session.user.role;
    const userId = session.user.id;

    // Users can delete their own requests if pending
    if (userRole === 'USER' && request.requester.id === userId && request.status === 'PENDING_APPROVAL') {
      return true;
    }

    // Managers can review requests
    if (userRole === 'MANAGER') {
      // Can claim unassigned requests
      if (!request.manager && request.status === 'PENDING_APPROVAL') {
        return true;
      }
      // Can review requests assigned to them
      if (request.manager?.id === userId && request.status === 'PENDING_APPROVAL') {
        return true;
      }
    }

    return false;
  };

  const getAvailableActions = () => {
    if (!request || !session?.user) return [];

    const userRole = session.user.role;
    const userId = session.user.id;
    const actions = [];

    if (userRole === 'AUDITOR' && request.requester.id === userId && request.status === 'PENDING_APPROVAL') {
      actions.push({ action: 'delete', label: 'Delete Request', color: 'bg-red-600' });
    }

    if (userRole === 'MANAGER' && request.status === 'PENDING_APPROVAL') {
      if (!request.manager) {
        actions.push({ action: 'claim', label: 'Claim Request', color: 'bg-blue-600' });
      } else if (request.manager.id === userId) {
        actions.push({ action: 'approve', label: 'Approve Request', color: 'bg-green-600' });
        actions.push({ action: 'reject', label: 'Reject Request', color: 'bg-red-600' });
      }
    }

    return actions;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-white dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500 dark:border-red-400"></div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Request Not Found</h2>
          <p className="text-gray-400">The request you're looking for doesn't exist or you don't have access to it.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/audits/workflow')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Workflow
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white">{request.title}</h1>
            <p className="text-gray-400">Audit Request Details</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {getStatusIcon(request.status)}
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(request.status)}`}>
              {request.status.replace('_', ' ')}
            </span>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getUrgencyColor(request.urgency)}`}>
            {request.urgency}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Request Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="p-6 rounded-lg shadow-lg" style={{ backgroundColor: '#2A2D3E' }}>
            <h2 className="text-xl font-semibold text-white mb-4">Request Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Asset</label>
                <p className="text-white">{request.asset.name}</p>
                <p className="text-sm text-gray-400">Serial: {request.asset.serialNumber}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Department</label>
                <p className="text-white">{request.asset.department}</p>
                <p className="text-sm text-gray-400">Category: {request.asset.category}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Requested By</label>
                <p className="text-white">{request.requester.name}</p>
                <p className="text-sm text-gray-400">{request.requester.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Assigned Manager</label>
                {request.manager ? (
                  <>
                    <p className="text-white">{request.manager.name}</p>
                    <p className="text-sm text-gray-400">{request.manager.email}</p>
                  </>
                ) : (
                  <p className="text-gray-400 italic">Not assigned</p>
                )}
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-400 mb-1">Reason for Audit</label>
              <p className="text-white">{request.reason}</p>
            </div>

            {request.description && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-400 mb-1">Detailed Description</label>
                <p className="text-white whitespace-pre-wrap">{request.description}</p>
              </div>
            )}

            {request.expectedFindings && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-400 mb-1">Expected Findings</label>
                <p className="text-white whitespace-pre-wrap">{request.expectedFindings}</p>
              </div>
            )}
          </div>

          {/* Review Information */}
          {(request.reviewedAt || request.reviewNotes || request.rejectionReason) && (
            <div className="p-6 rounded-lg shadow-lg" style={{ backgroundColor: '#2A2D3E' }}>
              <h2 className="text-xl font-semibold text-white mb-4">Review Information</h2>

              {request.reviewedAt && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-400 mb-1">Reviewed At</label>
                  <p className="text-white">{formatDate(request.reviewedAt)}</p>
                </div>
              )}

              {request.reviewNotes && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-400 mb-1">Review Notes</label>
                  <p className="text-white whitespace-pre-wrap">{request.reviewNotes}</p>
                </div>
              )}

              {request.rejectionReason && (
                <div className="p-4 bg-red-900 bg-opacity-50 border border-red-600 rounded-md">
                  <label className="block text-sm font-medium text-red-300 mb-1">Rejection Reason</label>
                  <p className="text-red-100 whitespace-pre-wrap">{request.rejectionReason}</p>
                </div>
              )}
            </div>
          )}

          {/* Timeline */}
          <div className="p-6 rounded-lg shadow-lg" style={{ backgroundColor: '#2A2D3E' }}>
            <h2 className="text-xl font-semibold text-white mb-4">Timeline</h2>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-blue-400" />
                <div>
                  <p className="text-white font-medium">Requested Date</p>
                  <p className="text-sm text-gray-400">{formatDate(request.requestedDate)}</p>
                </div>
              </div>

              {request.reviewedAt && (
                <div className="flex items-center gap-3">
                  {request.status === 'APPROVED' ? (
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-400" />
                  )}
                  <div>
                    <p className="text-white font-medium">
                      {request.status === 'APPROVED' ? 'Approved' : 'Rejected'}
                    </p>
                    <p className="text-sm text-gray-400">{formatDate(request.reviewedAt)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          {canUserTakeAction() && (
            <div className="p-6 rounded-lg shadow-lg" style={{ backgroundColor: '#2A2D3E' }}>
              <h3 className="text-lg font-semibold text-white mb-4">Actions</h3>

              <div className="space-y-3">
                {getAvailableActions().map((actionItem) => (
                  <button
                    key={actionItem.action}
                    onClick={() => {
                      if (actionItem.action === 'delete') {
                        handleDelete();
                      } else if (actionItem.action === 'claim') {
                        handleClaim();
                      } else {
                        setReviewAction(actionItem.action as 'approve' | 'reject');
                        setShowReviewForm(true);
                      }
                    }}
                    disabled={actionLoading}
                    className={`w-full px-4 py-2 text-white rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity ${actionItem.color}`}
                  >
                    {actionLoading ? 'Processing...' : actionItem.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Related Audits */}
          {request.audits && request.audits.length > 0 && (
            <div className="p-6 rounded-lg shadow-lg" style={{ backgroundColor: '#2A2D3E' }}>
              <h3 className="text-lg font-semibold text-white mb-4">Related Audits</h3>

              <div className="space-y-3">
                {request.audits.map((audit) => (
                  <div key={audit.id} className="p-3 bg-gray-700 rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(audit.status)}`}>
                        {audit.status}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDate(audit.auditDate)}
                      </span>
                    </div>
                    <p className="text-sm text-white">Condition: {audit.condition}</p>
                    <p className="text-xs text-gray-400">Workflow: {audit.workflowStatus}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Review Form Modal */}
      {showReviewForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4" style={{ backgroundColor: '#2A2D3E' }}>
            <div className="flex items-center justify-between p-6 border-b border-gray-600">
              <h2 className="text-xl font-semibold text-white">
                {reviewAction === 'approve' ? 'Approve Request' : 'Reject Request'}
              </h2>
              <button
                onClick={() => setShowReviewForm(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Review Notes {reviewAction === 'approve' ? '(Optional)' : ''}
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                  placeholder="Add any notes about your review..."
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {reviewAction === 'reject' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Rejection Reason *
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    placeholder="Please explain why this request is being rejected..."
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowReviewForm(false)}
                  className="px-4 py-2 text-gray-300 bg-gray-600 rounded-md hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReview}
                  disabled={actionLoading}
                  className={`px-4 py-2 text-white rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity ${
                    reviewAction === 'approve' ? 'bg-green-600' : 'bg-red-600'
                  }`}
                >
                  {actionLoading ? 'Processing...' : (reviewAction === 'approve' ? 'Approve' : 'Reject')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    <ToastContainer />
    </div>
  );
}
