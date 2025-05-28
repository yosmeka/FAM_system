'use client';

import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Settings, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';

interface MaintenanceSchedule {
  id: string;
  title: string;
  description: string;
  frequency: string;
  customInterval?: number;
  priority: string;
  status: string;
  estimatedHours?: number;
  startDate: string;
  endDate?: string;
  nextDue: string;
  leadTimeDays: number;
  autoAssign: boolean;
  lastGenerated?: string;
  createdAt: string;
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
    instructions?: string;
  };
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  maintenanceTasks: Array<{
    id: string;
    status: string;
    scheduledDate: string;
    completedAt?: string;
  }>;
}

export default function ScheduleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session } = useSession();
  const router = useRouter();
  const resolvedParams = use(params);
  const [schedule, setSchedule] = useState<MaintenanceSchedule | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchedule();
  }, [resolvedParams.id]);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/maintenance-schedules/${resolvedParams.id}`);
      if (!response.ok) throw new Error('Failed to fetch schedule');

      const data = await response.json();
      setSchedule(data);
    } catch (error) {
      console.error('Error fetching schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteSchedule = async () => {
    if (!confirm('Are you sure you want to delete this maintenance schedule? This will also delete all associated tasks. This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/maintenance-schedules/${resolvedParams.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Schedule deleted successfully');
        router.push('/maintenance/scheduled');
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Failed to delete schedule: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting schedule:', error);
      alert('Failed to delete schedule');
    }
  };

  const canManageSchedule = () => {
    return session?.user?.role === 'MANAGER' || session?.user?.role === 'ADMIN';
  };

  const getFrequencyDisplay = (frequency: string, customInterval?: number) => {
    const frequencyMap: { [key: string]: string } = {
      DAILY: 'Daily',
      WEEKLY: 'Weekly',
      MONTHLY: 'Monthly',
      QUARTERLY: 'Quarterly',
      SEMI_ANNUALLY: 'Semi-Annually',
      ANNUALLY: 'Annually',
      CUSTOM: customInterval ? `Every ${customInterval} days` : 'Custom',
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

  const isOverdue = () => {
    if (!schedule?.nextDue) return false;
    return new Date(schedule.nextDue) < new Date();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#212332' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: '#2697FF' }}></div>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#212332' }}>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Schedule Not Found</h2>
          <p className="text-gray-400 mb-4">The maintenance schedule you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push('/maintenance/scheduled')}
            className="px-4 py-2 rounded-lg text-white transition-colors"
            style={{ backgroundColor: '#2697FF' }}
          >
            Back to Schedules
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#212332' }}>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push('/maintenance/scheduled')}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">
            {schedule.title}
          </h1>
          <p className="text-gray-400">
            {schedule.asset.name} ({schedule.asset.serialNumber}) - {schedule.asset.location}
          </p>
        </div>

        {/* Manager Actions */}
        {canManageSchedule() && (
          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/maintenance/scheduled/${schedule.id}/edit`)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
              style={{ backgroundColor: '#2697FF' }}
            >
              <Settings className="w-4 h-4" />
              Edit Schedule
            </button>

            <button
              onClick={deleteSchedule}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4" />
              Delete Schedule
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Schedule Overview */}
          <div className="p-6 rounded-lg" style={{ backgroundColor: '#2A2D3E' }}>
            <h3 className="text-lg font-semibold text-white mb-4">Schedule Overview</h3>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Status:</span>
                <span className={`ml-2 font-medium ${getStatusColor(schedule.status)}`}>
                  {schedule.status}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Priority:</span>
                <span className={`ml-2 font-medium ${getPriorityColor(schedule.priority)}`}>
                  {schedule.priority}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Frequency:</span>
                <span className="ml-2 text-gray-300">
                  {getFrequencyDisplay(schedule.frequency, schedule.customInterval)}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Next Due:</span>
                <span className={`ml-2 ${isOverdue() ? 'text-red-400' : 'text-gray-300'}`}>
                  {new Date(schedule.nextDue).toLocaleDateString()}
                  {isOverdue() && ' (Overdue)'}
                </span>
              </div>
              {schedule.estimatedHours && (
                <div>
                  <span className="text-gray-400">Estimated Hours:</span>
                  <span className="ml-2 text-gray-300">{schedule.estimatedHours}h</span>
                </div>
              )}
              <div>
                <span className="text-gray-400">Lead Time:</span>
                <span className="ml-2 text-gray-300">{schedule.leadTimeDays} days</span>
              </div>
              <div>
                <span className="text-gray-400">Auto Assign:</span>
                <span className="ml-2 text-gray-300">{schedule.autoAssign ? 'Yes' : 'No'}</span>
              </div>
              {schedule.lastGenerated && (
                <div>
                  <span className="text-gray-400">Last Generated:</span>
                  <span className="ml-2 text-gray-300">
                    {new Date(schedule.lastGenerated).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="p-6 rounded-lg" style={{ backgroundColor: '#2A2D3E' }}>
            <h3 className="text-lg font-semibold text-white mb-3">Description</h3>
            <p className="text-gray-300">{schedule.description}</p>

            {schedule.template?.instructions && (
              <div className="mt-4">
                <h4 className="text-md font-medium text-white mb-2">Template Instructions</h4>
                <p className="text-gray-300 text-sm">{schedule.template.instructions}</p>
              </div>
            )}
          </div>

          {/* Recent Tasks */}
          <div className="p-6 rounded-lg" style={{ backgroundColor: '#2A2D3E' }}>
            <h3 className="text-lg font-semibold text-white mb-4">Recent Tasks</h3>

            {schedule.maintenanceTasks.length > 0 ? (
              <div className="space-y-3">
                {schedule.maintenanceTasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        task.status === 'COMPLETED' ? 'bg-green-400' :
                        task.status === 'IN_PROGRESS' ? 'bg-blue-400' :
                        task.status === 'SCHEDULED' ? 'bg-yellow-400' :
                        'bg-gray-400'
                      }`} />
                      <div>
                        <p className="text-white text-sm">
                          Scheduled: {new Date(task.scheduledDate).toLocaleDateString()}
                        </p>
                        {task.completedAt && (
                          <p className="text-gray-400 text-xs">
                            Completed: {new Date(task.completedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-sm text-gray-300 capitalize">
                      {task.status.toLowerCase().replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">No tasks generated yet.</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Assignment Info */}
          <div className="p-6 rounded-lg" style={{ backgroundColor: '#2A2D3E' }}>
            <h3 className="text-lg font-semibold text-white mb-4">Assignment</h3>
            <div className="space-y-3 text-sm">
              {schedule.assignedTo && (
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-gray-300">{schedule.assignedTo.name}</p>
                    <p className="text-gray-500">{schedule.assignedTo.email}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-gray-300">Created by</p>
                  <p className="text-gray-500">{schedule.createdBy.name}</p>
                </div>
              </div>

              {schedule.template && (
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-gray-300">{schedule.template.name}</p>
                    <p className="text-gray-500">{schedule.template.maintenanceType}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Schedule Dates */}
          <div className="p-6 rounded-lg" style={{ backgroundColor: '#2A2D3E' }}>
            <h3 className="text-lg font-semibold text-white mb-4">Schedule Dates</h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-400">Start Date:</span>
                <p className="text-gray-300">{new Date(schedule.startDate).toLocaleDateString()}</p>
              </div>

              {schedule.endDate && (
                <div>
                  <span className="text-gray-400">End Date:</span>
                  <p className="text-gray-300">{new Date(schedule.endDate).toLocaleDateString()}</p>
                </div>
              )}

              <div>
                <span className="text-gray-400">Created:</span>
                <p className="text-gray-300">{new Date(schedule.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
