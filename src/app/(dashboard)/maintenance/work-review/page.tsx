'use client';

import React from "react";
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/hooks/useRole';
import { useAuthContext } from '@/contexts/AuthContext';
import { CheckCircle, Clock, DollarSign, User, Calendar, FileText } from 'lucide-react';
import ManagerWorkReviewModal from '@/components/maintenance/ManagerWorkReviewModal';

interface WorkReviewTask {
  id: string;
  description: string;
  priority: string;
  status: string;
  scheduledDate: string;
  maintenanceType: string;
  issueType?: string;
  urgencyLevel?: string;
  workPerformed?: string;
  laborHours?: number;
  totalCost?: number;
  workStartedAt?: string;
  workCompletedAt?: string;
  technicianNotes?: string;
  asset: {
    name: string;
    serialNumber: string;
    location: string;
  };
  assignedTo?: {
    name: string;
    email: string;
  };
  requester?: {
    name: string;
    email: string;
  };
}

export default function WorkReviewPage() {
  const { isManager, isAdmin } = useRole();
  const { isLoading } = useAuthContext();
  const router = useRouter();
  const [tasks, setTasks] = useState<WorkReviewTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('WORK_COMPLETED');
  const [selectedTask, setSelectedTask] = useState<WorkReviewTask | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isManagerRole = isManager();
  const isAdminRole = isAdmin();

  const fetchWorkReviewTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.append('status', filter);
      params.append('workReview', 'true');
      const response = await fetch(`/api/maintenance?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to fetch work review tasks');
        setTasks([]);
      }
    } catch (error) {
      setError('Failed to fetch work review tasks');
      setTasks([]);
      console.error('Error fetching work review tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (isLoading) return;
    if (!isManagerRole && !isAdminRole) {
      router.push('/maintenance');
      return;
    }
    fetchWorkReviewTasks();
  }, [filter, isManagerRole, isAdminRole, isLoading, router, fetchWorkReviewTasks]);

  const handleReviewWork = (task: WorkReviewTask) => {
    setSelectedTask(task);
    setShowReviewModal(true);
  };

  const handleReviewCompleted = () => {
    fetchWorkReviewTasks();
    setSelectedTask(null);
    setShowReviewModal(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'WORK_COMPLETED': return 'text-orange-400';
      case 'PENDING_REVIEW': return 'text-purple-400';
      case 'COMPLETED': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'WORK_COMPLETED': return <FileText className="w-4 h-4" />;
      case 'PENDING_REVIEW': return <Clock className="w-4 h-4" />;
      case 'COMPLETED': return <CheckCircle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'text-red-400';
      case 'HIGH': return 'text-orange-400';
      case 'MEDIUM': return 'text-yellow-400';
      case 'LOW': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-white dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500 dark:border-red-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-gray-900">
        <FileText className="w-16 h-16 text-red-400 mb-4" />
        <h3 className="text-xl font-semibold dark:text-white mb-2">Error</h3>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 dark:bg-gray-900">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold dark:text-white mb-2">Work Review Dashboard</h1>
          <p className="text-gray-400">Review and approve completed maintenance work</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-4 mb-6">
        {['WORK_COMPLETED', 'PENDING_REVIEW', 'COMPLETED'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === status
                ? 'text-white'
                : 'dark:text-gray-400 hover:text-red-600'
            }`}
            style={{
              backgroundColor: filter === status ? 'red' : '',
            }}
          >
            {status === 'WORK_COMPLETED' ? 'Work Completed' :
             status === 'PENDING_REVIEW' ? 'Pending Review' :
             'Approved'}
            {status === filter && tasks.length > 0 && (
              <span className="ml-2 px-2 py-1 text-xs bg-white text-blue-600 rounded-full">
                {tasks.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tasks Grid */}
      {tasks.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold dark:text-white mb-2">No Work to Review</h3>
          <p className="text-gray-400">
            {filter === 'WORK_COMPLETED'
              ? 'No completed work waiting for your review.'
              : `No ${filter.toLowerCase().replace('_', ' ')} work found.`
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold dark:text-white">
                      {task.description}
                    </h3>
                    {task.maintenanceType === 'CORRECTIVE' && (
                      <span className="px-2 py-1 text-xs bg-red-600 text-white rounded-full">
                        CORRECTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-sm dark:text-gray-400">
                    {task.asset.name} ({task.asset.serialNumber})
                  </p>
                  {task.issueType && (
                    <p className="text-xs text-orange-400 mt-1">
                      Issue: {task.issueType}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={getStatusColor(task.status)}>
                    {getStatusIcon(task.status)}
                  </span>
                  <span className={`text-sm font-medium ${getStatusColor(task.status)}`}>
                    {task.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Work Details */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4" />
                  <span className="dark:text-gray-300">
                    Technician: {task.assignedTo?.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4" />
                  <span className="dark:text-gray-300">
                    Completed: {task.workCompletedAt ? new Date(task.workCompletedAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                {task.laborHours && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4" />
                    <span className="dark:text-gray-300">
                      Labor: {task.laborHours}h
                    </span>
                  </div>
                )}
                {task.totalCost && (
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-green-400 font-medium">
                      Total Cost: ${task.totalCost.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <span className={`${getPriorityColor(task.priority)} font-medium`}>
                    {task.priority} Priority
                    {task.urgencyLevel && ` (${task.urgencyLevel})`}
                  </span>
                </div>
              </div>

              {/* Work Summary */}
              {task.workPerformed && (
                <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <p className="text-xs dark:text-gray-400 mb-1">Work Performed:</p>
                  <p className="text-sm dark:text-gray-300 line-clamp-3">
                    {task.workPerformed}
                  </p>
                </div>
              )}

              {/* Review Button */}
              {task.status === 'WORK_COMPLETED' && (
                <button
                  onClick={() => handleReviewWork(task)}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors w-full mt-2"
                >
                  Review Work
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedTask && (
        <ManagerWorkReviewModal
          open={showReviewModal}
          task={selectedTask}
          onClose={() => setShowReviewModal(false)}
          onReviewCompleted={handleReviewCompleted}
        />
      )}
    </div>
  );
}