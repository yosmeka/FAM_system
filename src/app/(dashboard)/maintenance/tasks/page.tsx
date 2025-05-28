'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { CheckCircle, AlertCircle, Settings } from 'lucide-react';

interface MaintenanceTask {
  id: string;
  description: string;
  priority: string;
  status: string;
  scheduledDate: string;
  estimatedHours?: number;
  actualHours?: number;
  checklistItems?: string;
  notes?: string;
  asset: {
    id: string;
    name: string;
    serialNumber: string;
    location: string;
  };
  schedule?: {
    id: string;
    title: string;
    frequency: string;
  };
  template?: {
    id: string;
    name: string;
    maintenanceType: string;
  };
}

export default function MyTasksPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchMyTasks();
  }, [filter]);

  const fetchMyTasks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/maintenance/my-tasks');
      if (!response.ok) throw new Error('Failed to fetch tasks');
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return 'text-blue-400';
      case 'IN_PROGRESS': return 'text-yellow-400';
      case 'COMPLETED': return 'text-green-400';
      case 'CANCELLED': return 'text-red-400';
      default: return 'text-gray-400';
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return <Settings className="w-4 h-4" />;
      case 'IN_PROGRESS': return <AlertCircle className="w-4 h-4" />;
      case 'COMPLETED': return <CheckCircle className="w-4 h-4" />;
      default: return <Settings className="w-4 h-4" />;
    }
  };

  const filteredTasks = filter === 'all'
    ? tasks
    : tasks.filter(task => task.status === filter.toUpperCase());

  const isOverdue = (scheduledDate: string) => {
    return new Date(scheduledDate) < new Date() && !['COMPLETED', 'CANCELLED'].includes(tasks.find(t => t.scheduledDate === scheduledDate)?.status || '');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#212332' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: '#2697FF' }}></div>
      </div>
    );
  }

  return (
    <div className="p-6" style={{ backgroundColor: '#212332' }}>
      {/* Navigation Tabs */}
      <div className="mb-6">
        <div className="flex space-x-1 p-1 rounded-lg w-fit" style={{ backgroundColor: '#2A2D3E' }}>
          <button
            onClick={() => router.push('/maintenance/scheduled')}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-600 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Scheduled Maintenance
          </button>

          <button
            onClick={() => router.push('/maintenance/templates')}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-600 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Templates
          </button>

          <button
            onClick={() => {/* Current page */}}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-white shadow-sm font-medium"
            style={{ backgroundColor: '#2697FF' }}
          >
            <Settings className="w-4 h-4" />
            My Tasks
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">My Maintenance Tasks</h1>
          <p className="text-gray-400">Tasks assigned to you from scheduled maintenance</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-4 mb-6">
        {['all', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED'].map((status) => (
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
            {status === 'all' ? 'All Tasks' : status.charAt(0) + status.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Tasks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTasks.map((task) => (
          <div
            key={task.id}
            className="p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
            style={{ backgroundColor: '#2A2D3E' }}
            onClick={() => router.push(`/maintenance/${task.id}`)}
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">
                  {task.schedule?.title || task.description}
                </h3>
                <p className="text-sm text-gray-400">
                  {task.asset.name} ({task.asset.serialNumber})
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`${getStatusIcon(task.status)} ${getStatusColor(task.status)}`}>
                  {getStatusIcon(task.status)}
                </span>
                <span className={`text-sm font-medium ${getStatusColor(task.status)}`}>
                  {task.status}
                </span>
              </div>
            </div>

            {/* Task Info */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <Settings className="w-4 h-4" />
                <span className={isOverdue(task.scheduledDate) ? 'text-red-400' : 'text-gray-300'}>
                  Due: {new Date(task.scheduledDate).toLocaleDateString()}
                  {isOverdue(task.scheduledDate) && ' (Overdue)'}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span className={`${getPriorityColor(task.priority)} font-medium`}>
                  {task.priority} Priority
                </span>
              </div>

              {task.estimatedHours && (
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Settings className="w-4 h-4" />
                  <span>Est. {task.estimatedHours}h</span>
                </div>
              )}

              {task.template && (
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Settings className="w-4 h-4" />
                  <span>{task.template.name}</span>
                </div>
              )}
            </div>

            {/* Progress Indicator */}
            {task.checklistItems && (
              <div className="mt-4 pt-4 border-t border-gray-600">
                <p className="text-xs text-gray-400 mb-2">Checklist Progress</p>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      backgroundColor: '#2697FF',
                      width: `${calculateProgress(task.checklistItems)}%`
                    }}
                  ></div>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {calculateProgress(task.checklistItems)}% Complete
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredTasks.length === 0 && (
        <div className="text-center py-12">
          <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Tasks Found</h3>
          <p className="text-gray-400">
            {filter === 'all'
              ? 'You have no maintenance tasks assigned to you yet.'
              : `No ${filter.toLowerCase()} tasks found.`
            }
          </p>
        </div>
      )}
    </div>
  );
}

function calculateProgress(checklistItems: string): number {
  try {
    const items = JSON.parse(checklistItems);
    if (!Array.isArray(items) || items.length === 0) return 0;

    const completedItems = items.filter(item => item.completed).length;
    return Math.round((completedItems / items.length) * 100);
  } catch {
    return 0;
  }
}
