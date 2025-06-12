'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Plus, Settings, CheckCircle } from 'lucide-react';
import CreateScheduleModal from '@/components/maintenance/CreateScheduleModal';
import ManagerReviewModal from '@/components/maintenance/ManagerReviewModal';

interface MaintenanceSchedule {
  id: string;
  title: string;
  description?: string;
  frequency: string;
  priority: string;
  status: string;
  nextDue: string;
  estimatedHours?: number;
  asset: {
    id: string;
    name: string;
    serialNumber: string;
    location: string;
  };
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  };
  template?: {
    id: string;
    name: string;
    maintenanceType: string;
  };
  maintenanceTasks: Array<{
    id: string;
    status: string;
    scheduledDate: string;
    completedAt?: string;
  }>;
}

interface MaintenanceTask {
  id: string;
  description: string;
  status: string;
  priority: string;
  completedAt?: string;
  workPerformed?: string;
  laborHours?: number;
  totalCost?: number;
  asset: {
    name: string;
    serialNumber: string;
  };
  assignedTo?: {
    name: string;
    email: string;
  };
}

export default function ScheduledMaintenancePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Manager review states
  const [activeTab, setActiveTab] = useState('schedules'); // 'schedules' or 'reviews'
  const [pendingReviews, setPendingReviews] = useState<MaintenanceTask[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [selectedTaskForReview, setSelectedTaskForReview] = useState<MaintenanceTask | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const handleScheduleCreated = () => {
    setShowCreateModal(false);
    fetchSchedules(); // Refresh the schedules list
  };

  const fetchSchedules = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.append('status', filter);
      }

      const response = await fetch(`/api/maintenance-schedules?${params}`);
      if (response.ok) {
        const data = await response.json();
        setSchedules(data);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (activeTab === 'schedules') {
      fetchSchedules();
    } else if (activeTab === 'reviews') {
      fetchPendingReviews();
    }
  }, [filter, activeTab, fetchSchedules]);

  const fetchPendingReviews = async () => {
    try {
      setReviewLoading(true);
      const response = await fetch('/api/maintenance?status=PENDING_REVIEW');
      if (response.ok) {
        const data = await response.json();
        setPendingReviews(data);
      }
    } catch (error) {
      console.error('Error fetching pending reviews:', error);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleReviewTask = (task: MaintenanceTask) => {
    setSelectedTaskForReview(task);
    setShowReviewModal(true);
  };

  const handleReviewCompleted = () => {
    fetchPendingReviews(); // Refresh the pending reviews list
    setSelectedTaskForReview(null);
    setShowReviewModal(false);
  };

  const getFrequencyDisplay = (frequency: string) => {
    const frequencyMap: { [key: string]: string } = {
      DAILY: 'Daily',
      WEEKLY: 'Weekly',
      MONTHLY: 'Monthly',
      QUARTERLY: 'Quarterly',
      SEMI_ANNUALLY: 'Semi-Annually',
      ANNUALLY: 'Annually',
      CUSTOM: 'Custom',
    };
    return frequencyMap[frequency] || frequency;
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'text-green-400';
      case 'INACTIVE': return 'text-gray-400';
      case 'PAUSED': return 'text-yellow-400';
      case 'EXPIRED': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const isOverdue = (nextDue: string) => {
    return new Date(nextDue) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Loading scheduled maintenance...</div>
      </div>
    );
  }

  return (
    <div className="p-6" style={{ backgroundColor: '#212332' }}>
      {/* Navigation Tabs */}
      <div className="mb-6">
        <div className="flex space-x-1 p-1 rounded-lg w-fit" style={{ backgroundColor: '#2A2D3E' }}>
          <button
            onClick={() => setActiveTab('schedules')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === 'schedules'
                ? 'text-white shadow-sm font-medium'
                : 'text-gray-300 hover:text-white hover:bg-gray-600'
            }`}
            style={{ backgroundColor: activeTab === 'schedules' ? '#2697FF' : 'transparent' }}
          >
            <Settings className="w-4 h-4" />
            Scheduled Maintenance
          </button>

          {(session?.user?.role === 'MANAGER' || session?.user?.role === 'ADMIN') && (
            <button
              onClick={() => setActiveTab('reviews')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                activeTab === 'reviews'
                  ? 'text-white shadow-sm font-medium'
                  : 'text-gray-300 hover:text-white hover:bg-gray-600'
              }`}
              style={{ backgroundColor: activeTab === 'reviews' ? '#2697FF' : 'transparent' }}
            >
              <Settings className="w-4 h-4" />
              Manager Review
              {pendingReviews.length > 0 && (
                <span className="ml-1 px-2 py-1 text-xs bg-red-500 text-white rounded-full">
                  {pendingReviews.length}
                </span>
              )}
            </button>
          )}

          {(session?.user?.role === 'MANAGER' || session?.user?.role === 'ADMIN') && (
            <button
              onClick={() => router.push('/maintenance/templates')}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-600 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Templates
            </button>
          )}

          {session?.user?.role === 'USER' && (
            <button
              onClick={() => router.push('/maintenance/tasks')}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-600 transition-colors"
            >
              <Settings className="w-4 h-4" />
              My Tasks
            </button>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {activeTab === 'schedules' ? 'Scheduled Maintenance' : 'Manager Review'}
          </h1>
          <p className="text-gray-400">
            {activeTab === 'schedules'
              ? 'Manage recurring maintenance schedules'
              : 'Review and approve completed maintenance tasks'
            }
          </p>
        </div>

        <div className="flex gap-3">
          {/* Debug: Show user role */}
          <div className="text-xs text-gray-400 mr-4">
            Role: {session?.user?.role || 'Unknown'}
          </div>

          {session?.user?.role === 'MANAGER' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
              style={{ backgroundColor: '#2697FF' }}
            >
              <Plus className="w-4 h-4" />
              Create Schedule
            </button>
          )}
        </div>
      </div>

      {/* Manager Review Content */}
      {activeTab === 'reviews' ? (
        <div>
          {reviewLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading pending reviews...</p>
            </div>
          ) : pendingReviews.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Pending Reviews</h3>
              <p className="text-gray-400">All maintenance tasks have been reviewed.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingReviews.map((task) => (
                <div
                  key={task.id}
                  className="p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
                  style={{ backgroundColor: '#2A2D3E' }}
                >
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">
                        {task.asset?.name}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {task.asset?.serialNumber}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-orange-400">
                      PENDING REVIEW
                    </span>
                  </div>

                  {/* Task Info */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <Settings className="w-4 h-4" />
                      <span>Technician: {task.assignedTo?.name}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <Settings className="w-4 h-4" />
                      <span>Completed: {task.completedAt ? new Date(task.completedAt).toLocaleDateString() : 'N/A'}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <Settings className="w-4 h-4" />
                      <span>Priority: {task.priority}</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => handleReviewTask(task)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: '#2697FF' }}
                  >
                    <Settings className="w-4 h-4" />
                    Review Task
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          {/* Filter Tabs */}
          <div className="flex gap-4 mb-6">
            {['all', 'ACTIVE', 'INACTIVE', 'PAUSED'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === status
                    ? 'text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
                style={{
                  backgroundColor: filter === status ? '#2697FF' : '#2A2D3E',
                }}
              >
                {status === 'all' ? 'All Schedules' : status.charAt(0) + status.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Schedules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                className="p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                style={{ backgroundColor: '#2A2D3E' }}
                onClick={() => window.location.href = `/maintenance/scheduled/${schedule.id}`}
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {schedule.title}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {schedule.asset.name} ({schedule.asset.serialNumber})
                    </p>
                  </div>
                  <span className={`text-sm font-medium ${getStatusColor(schedule.status)}`}>
                    {schedule.status}
                  </span>
                </div>

                {/* Schedule Info */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <Settings className="w-4 h-4" />
                    <span>Every {getFrequencyDisplay(schedule.frequency)}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Settings className="w-4 h-4" />
                    <span className={isOverdue(schedule.nextDue) ? 'text-red-400' : 'text-gray-300'}>
                      Next due: {new Date(schedule.nextDue).toLocaleDateString()}
                      {isOverdue(schedule.nextDue) && ' (Overdue)'}
                    </span>
                  </div>

                  {schedule.assignedTo && (
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <Settings className="w-4 h-4" />
                      <span>{schedule.assignedTo.name}</span>
                    </div>
                  )}
                </div>

                {/* Priority and Template */}
                <div className="flex justify-between items-center">
                  <span className={`text-sm font-medium ${getPriorityColor(schedule.priority)}`}>
                    {schedule.priority} Priority
                  </span>

                  {schedule.template && (
                    <span className="text-xs text-gray-400">
                      {schedule.template.name}
                    </span>
                  )}
                </div>

                {/* Recent Tasks */}
                {schedule.maintenanceTasks.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-600">
                    <p className="text-xs text-gray-400 mb-2">
                      Recent tasks: {schedule.maintenanceTasks.length}
                    </p>
                    <div className="flex gap-1">
                      {schedule.maintenanceTasks.slice(0, 5).map((task) => (
                        <div
                          key={task.id}
                          className={`w-2 h-2 rounded-full ${
                            task.status === 'COMPLETED' ? 'bg-green-400' :
                            task.status === 'IN_PROGRESS' ? 'bg-blue-400' :
                            task.status === 'SCHEDULED' ? 'bg-yellow-400' :
                            'bg-gray-400'
                          }`}
                          title={`${task.status} - ${new Date(task.scheduledDate).toLocaleDateString()}`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {schedules.length === 0 && (
            <div className="text-center py-12">
              <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Scheduled Maintenance</h3>
              <p className="text-gray-400 mb-6">
                {session?.user?.role === 'MANAGER'
                  ? 'Create your first maintenance schedule to get started.'
                  : 'No maintenance schedules have been created yet.'
                }
              </p>
              {session?.user?.role === 'MANAGER' && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-6 py-3 rounded-lg text-white transition-colors"
                  style={{ backgroundColor: '#2697FF' }}
                >
                  Create Schedule
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Create Schedule Modal */}
      {showCreateModal && (
        <CreateScheduleModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onScheduleCreated={handleScheduleCreated}
        />
      )}

      {/* Manager Review Modal */}
      {showReviewModal && selectedTaskForReview && (
        <ManagerReviewModal
          open={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          task={selectedTaskForReview}
          onReviewCompleted={handleReviewCompleted}
        />
      )}
    </div>
  );
}