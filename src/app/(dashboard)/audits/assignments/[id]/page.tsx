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
  Play
} from 'lucide-react';
import toast from 'react-hot-toast';
import PerformAuditModal from '@/components/audit/PerformAuditModal';

interface AuditAssignment {
  id: string;
  title: string;
  description?: string;
  priority: string;
  dueDate: string;
  scheduledDate?: string;
  status: string;
  instructions?: string;
  estimatedHours?: number;
  actualHours?: number;
  acceptedAt?: string;
  startedAt?: string;
  completedAt?: string;
  asset: {
    id: string;
    name: string;
    serialNumber: string;
    department: string;
    category: string;
    location: string;
  };
  assignedTo: {
    id: string;
    name: string;
    email: string;
  };
  assignedBy: {
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

export default function AssignmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [assignment, setAssignment] = useState<AuditAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showPerformAuditModal, setShowPerformAuditModal] = useState(false);
  const [assignmentId, setAssignmentId] = useState<string | null>(null);

  useEffect(() => {
    const initializeParams = async () => {
      const { id } = await params;
      setAssignmentId(id);
    };
    initializeParams();
  }, [params]);

  useEffect(() => {
    if (assignmentId) {
      fetchAssignment();
    }
  }, [assignmentId]);

  const fetchAssignment = async () => {
    if (!assignmentId) return;

    try {
      const response = await fetch(`/api/audit-assignments/${assignmentId}`);
      if (response.ok) {
        const data = await response.json();
        setAssignment(data);
      } else {
        toast.error('Assignment not found');
        router.push('/audits/workflow');
      }
    } catch (error) {
      console.error('Error fetching assignment:', error);
      toast.error('Failed to load assignment');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string, additionalData?: any) => {
    if (!assignment) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/audit-assignments/${assignment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          ...additionalData,
        }),
      });

      if (response.ok) {
        const updatedAssignment = await response.json();
        setAssignment(updatedAssignment);
        toast.success(`Assignment ${action}d successfully!`);
      } else {
        const error = await response.json();
        toast.error(error.error || `Failed to ${action} assignment`);
      }
    } catch (error) {
      console.error(`Error ${action}ing assignment:`, error);
      toast.error(`Failed to ${action} assignment`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!assignment) return;

    if (!confirm('Are you sure you want to delete this assignment? This action cannot be undone.')) {
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`/api/audit-assignments/${assignment.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Assignment deleted successfully!');
        router.push('/audits/workflow');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete assignment');
      }
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast.error('Failed to delete assignment');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'PENDING':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'IN_PROGRESS':
      case 'ACCEPTED':
        return <User className="h-5 w-5 text-blue-500" />;
      case 'OVERDUE':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'IN_PROGRESS':
      case 'ACCEPTED':
        return 'bg-blue-100 text-blue-800';
      case 'OVERDUE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
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
    if (!session?.user || !assignment) return false;

    const userRole = session.user.role;
    const userId = session.user.id;

    // Users can act on assignments assigned to them
    if (userRole === 'USER' && assignment.assignedTo.id === userId) {
      return true;
    }

    // Managers can act on assignments they created
    if (userRole === 'MANAGER' && assignment.assignedBy.id === userId) {
      return true;
    }

    return false;
  };

  const getAvailableActions = () => {
    if (!assignment || !session?.user) return [];

    const userRole = session.user.role;
    const userId = session.user.id;
    const actions = [];

    if (userRole === 'USER' && assignment.assignedTo.id === userId) {
      switch (assignment.status) {
        case 'PENDING':
          actions.push({ action: 'accept', label: 'Accept Assignment', color: 'bg-green-600' });
          break;
        case 'ACCEPTED':
          actions.push({ action: 'start', label: 'Start Audit', color: 'bg-blue-600' });
          break;
        case 'IN_PROGRESS':
          actions.push({ action: 'perform', label: 'Perform Audit', color: 'bg-blue-600' });
          break;
      }
    }

    if (userRole === 'MANAGER' && assignment.assignedBy.id === userId) {
      if (assignment.status !== 'COMPLETED') {
        actions.push({ action: 'cancel', label: 'Cancel Assignment', color: 'bg-red-600' });
      }
    }

    return actions;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#212332' }}>
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#212332' }}>
        <div className="text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Assignment Not Found</h2>
          <p className="text-gray-400">The assignment you're looking for doesn't exist or you don't have access to it.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 min-h-screen" style={{ backgroundColor: '#212332' }}>
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
            <h1 className="text-3xl font-bold text-white">{assignment.title}</h1>
            <p className="text-gray-400">Assignment Details</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {getStatusIcon(assignment.status)}
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(assignment.status)}`}>
              {assignment.status.replace('_', ' ')}
            </span>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(assignment.priority)}`}>
            {assignment.priority}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assignment Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="p-6 rounded-lg shadow-lg" style={{ backgroundColor: '#2A2D3E' }}>
            <h2 className="text-xl font-semibold text-white mb-4">Assignment Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Asset</label>
                <p className="text-white">{assignment.asset.name}</p>
                <p className="text-sm text-gray-400">Serial: {assignment.asset.serialNumber}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Department</label>
                <p className="text-white">{assignment.asset.department}</p>
                <p className="text-sm text-gray-400">Category: {assignment.asset.category}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Assigned To</label>
                <p className="text-white">{assignment.assignedTo.name}</p>
                <p className="text-sm text-gray-400">{assignment.assignedTo.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Assigned By</label>
                <p className="text-white">{assignment.assignedBy.name}</p>
                <p className="text-sm text-gray-400">{assignment.assignedBy.email}</p>
              </div>
            </div>

            {assignment.description && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
                <p className="text-white">{assignment.description}</p>
              </div>
            )}

            {assignment.instructions && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-400 mb-1">Instructions</label>
                <p className="text-white whitespace-pre-wrap">{assignment.instructions}</p>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="p-6 rounded-lg shadow-lg" style={{ backgroundColor: '#2A2D3E' }}>
            <h2 className="text-xl font-semibold text-white mb-4">Timeline</h2>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-blue-400" />
                <div>
                  <p className="text-white font-medium">Due Date</p>
                  <p className="text-sm text-gray-400">{formatDate(assignment.dueDate)}</p>
                </div>
              </div>

              {assignment.scheduledDate && (
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-green-400" />
                  <div>
                    <p className="text-white font-medium">Scheduled Date</p>
                    <p className="text-sm text-gray-400">{formatDate(assignment.scheduledDate)}</p>
                  </div>
                </div>
              )}

              {assignment.acceptedAt && (
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <div>
                    <p className="text-white font-medium">Accepted</p>
                    <p className="text-sm text-gray-400">{formatDate(assignment.acceptedAt)}</p>
                  </div>
                </div>
              )}

              {assignment.startedAt && (
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-blue-400" />
                  <div>
                    <p className="text-white font-medium">Started</p>
                    <p className="text-sm text-gray-400">{formatDate(assignment.startedAt)}</p>
                  </div>
                </div>
              )}

              {assignment.completedAt && (
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <div>
                    <p className="text-white font-medium">Completed</p>
                    <p className="text-sm text-gray-400">{formatDate(assignment.completedAt)}</p>
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
                      if (actionItem.action === 'perform') {
                        setShowPerformAuditModal(true);
                      } else {
                        handleAction(actionItem.action);
                      }
                    }}
                    disabled={actionLoading}
                    className={`w-full px-4 py-2 text-white rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2 ${actionItem.color}`}
                  >
                    {actionItem.action === 'perform' && <Play className="h-4 w-4" />}
                    {actionLoading ? 'Processing...' : actionItem.label}
                  </button>
                ))}

                {session?.user?.role === 'MANAGER' && assignment.assignedBy.id === session.user.id && assignment.status !== 'COMPLETED' && (
                  <button
                    onClick={handleDelete}
                    disabled={actionLoading}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    {actionLoading ? 'Deleting...' : 'Delete Assignment'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Effort Tracking */}
          <div className="p-6 rounded-lg shadow-lg" style={{ backgroundColor: '#2A2D3E' }}>
            <h3 className="text-lg font-semibold text-white mb-4">Effort Tracking</h3>

            <div className="space-y-3">
              {assignment.estimatedHours && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Estimated Hours</label>
                  <p className="text-white">{assignment.estimatedHours} hours</p>
                </div>
              )}

              {assignment.actualHours && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Actual Hours</label>
                  <p className="text-white">{assignment.actualHours} hours</p>
                </div>
              )}
            </div>
          </div>

          {/* Related Audits */}
          {assignment.audits && assignment.audits.length > 0 && (
            <div className="p-6 rounded-lg shadow-lg" style={{ backgroundColor: '#2A2D3E' }}>
              <h3 className="text-lg font-semibold text-white mb-4">Related Audits</h3>

              <div className="space-y-3">
                {assignment.audits.map((audit) => (
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

      {/* Perform Audit Modal */}
      {assignment && (
        <PerformAuditModal
          isOpen={showPerformAuditModal}
          onClose={() => setShowPerformAuditModal(false)}
          onSuccess={fetchAssignment}
          assignmentId={assignment.id}
          asset={assignment.asset}
          title={assignment.title}
          instructions={assignment.instructions}
        />
      )}
    </div>
  );
}
