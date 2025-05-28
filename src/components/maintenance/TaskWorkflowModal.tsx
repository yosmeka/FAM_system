'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { X, CheckCircle, AlertCircle, Settings } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ChecklistItem {
  id: number;
  task: string;
  completed: boolean;
  completedAt?: string;
  notes?: string;
}

interface TaskWorkflowModalProps {
  open: boolean;
  onClose: () => void;
  taskId: string;
  onTaskUpdated: () => void;
}

export default function TaskWorkflowModal({ open, onClose, taskId, onTaskUpdated }: TaskWorkflowModalProps) {
  const { data: session } = useSession();
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [notes, setNotes] = useState('');
  const [actualHours, setActualHours] = useState<number | ''>('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (open && taskId) {
      fetchTask();
    }
  }, [open, taskId]);

  const fetchTask = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/maintenance/${taskId}`);
      if (!response.ok) throw new Error('Failed to fetch task');

      const data = await response.json();
      console.log('=== TASK WORKFLOW MODAL DEBUG ===');
      console.log('Fetched task data:', data);
      console.log('Task has schedule:', !!data.schedule);
      console.log('Task schedule:', data.schedule);
      console.log('Task has template:', !!data.schedule?.template);
      console.log('Task template:', data.schedule?.template);
      console.log('Template checklist items:', data.schedule?.template?.checklistItems);
      console.log('Task checklist items:', data.checklistItems);
      console.log('=== END DEBUG ===');
      setTask(data);
      setStatus(data.status);
      setNotes(data.notes || '');
      setActualHours(data.actualHours || '');

      // Parse checklist items - prioritize task progress over template, but use template for labels
      let checklistToUse: ChecklistItem[] = [];

      // First, try to parse existing task checklist (preserves progress)
      let taskChecklistItems: any[] = [];
      if (data.checklistItems) {
        try {
          const items = JSON.parse(data.checklistItems);
          console.log('Parsed task checklist items:', items);
          console.log('Task checklist type:', typeof items);
          console.log('Task checklist is array:', Array.isArray(items));

          if (Array.isArray(items)) {
            taskChecklistItems = items;
          }
        } catch (e) {
          console.error('Failed to parse task checklist:', e);
        }
      }

      // Get template checklist for labels
      let templateItems: ChecklistItem[] = [];
      if (data.schedule?.template?.checklistItems) {
        const templateData = data.schedule.template.checklistItems;
        console.log('Template checklist items (raw):', templateData);
        console.log('Template checklist type:', typeof templateData);

        try {
          // Parse the JSON string from template
          const parsedTemplate = typeof templateData === 'string' ? JSON.parse(templateData) : templateData;
          console.log('Parsed template data:', parsedTemplate);

          if (Array.isArray(parsedTemplate)) {
            templateItems = parsedTemplate.map((item: any, index: number) => {
              if (typeof item === 'object' && item !== null && item.task) {
                // Seeded data format: { id: 1, task: 'Turn off HVAC system', completed: false }
                return {
                  id: item.id || index + 1,
                  task: String(item.task),
                  completed: false, // Always start fresh for new tasks
                };
              } else if (typeof item === 'string') {
                // Simple string format
                return {
                  id: index + 1,
                  task: item,
                  completed: false,
                };
              } else {
                // Fallback
                return {
                  id: index + 1,
                  task: `Checklist item ${index + 1}`,
                  completed: false,
                };
              }
            });
          }
        } catch (e) {
          console.error('Failed to parse template checklist:', e);
        }
      }

      // Build final checklist - merge task progress with template labels
      if (taskChecklistItems.length > 0) {
        // Use existing task checklist but fix labels from template
        checklistToUse = taskChecklistItems.map((item: any, index: number) => {
          let taskText = '';

          // First try to get text from template (most reliable)
          if (templateItems[index] && templateItems[index].task) {
            taskText = templateItems[index].task;
          } else if (typeof item === 'string') {
            taskText = item;
          } else if (typeof item === 'object' && item !== null) {
            // If it's an object, try to extract meaningful text
            if (item.task) {
              taskText = String(item.task);
            } else if (item.text) {
              taskText = String(item.text);
            } else if (item.description) {
              taskText = String(item.description);
            } else {
              // Fallback: use template or index-based naming
              taskText = templateItems[index]?.task || `Checklist item ${index + 1}`;
            }
          } else {
            taskText = templateItems[index]?.task || `Checklist item ${index + 1}`;
          }

          return {
            id: item.id || index + 1,
            task: taskText,
            completed: Boolean(item.completed),
            completedAt: item.completedAt,
            notes: item.notes,
          };
        });
      } else if (templateItems.length > 0) {
        // No task checklist, create from template
        checklistToUse = templateItems;
      }

      console.log('Final checklist to use:', checklistToUse);
      setChecklist(checklistToUse);
    } catch (error) {
      console.error('Error fetching task:', error);
      toast.error('Failed to load task details');
    } finally {
      setLoading(false);
    }
  };

  const updateChecklistItem = (itemId: number, completed: boolean, itemNotes?: string) => {
    console.log('Updating checklist item:', { itemId, completed, itemNotes });
    console.log('Current checklist:', checklist);

    setChecklist(prev => {
      const updated = prev.map(item =>
        item.id === itemId
          ? {
              ...item,
              completed,
              completedAt: completed ? new Date().toISOString() : undefined,
              notes: itemNotes || item.notes
            }
          : item
      );
      console.log('Updated checklist:', updated);
      return updated;
    });
  };

  const startTask = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/maintenance/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'IN_PROGRESS',
          notes,
          checklistItems: JSON.stringify(checklist),
          notifyManager: true, // Notify manager when task is started
        }),
      });

      if (!response.ok) throw new Error('Failed to start task');

      setStatus('IN_PROGRESS');
      toast.success('Task started successfully - Manager has been notified');
      onTaskUpdated();
    } catch (error) {
      console.error('Error starting task:', error);
      toast.error('Failed to start task');
    } finally {
      setSaving(false);
    }
  };

  const saveProgress = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/maintenance/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          notes,
          actualHours: actualHours || undefined,
          checklistItems: JSON.stringify(checklist),
          notifyManager: true, // Notify manager of progress updates
        }),
      });

      if (!response.ok) throw new Error('Failed to save progress');

      toast.success('Progress saved successfully - Manager has been notified');
      onTaskUpdated();
    } catch (error) {
      console.error('Error saving progress:', error);
      toast.error('Failed to save progress');
    } finally {
      setSaving(false);
    }
  };

  const completeTask = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/maintenance/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'PENDING_REVIEW', // Changed from COMPLETED to PENDING_REVIEW
          notes,
          actualHours: actualHours || undefined,
          checklistItems: JSON.stringify(checklist),
          completedAt: new Date().toISOString(),
          notifyManager: true, // Notify manager for review
        }),
      });

      if (!response.ok) throw new Error('Failed to complete task');

      setStatus('PENDING_REVIEW');
      toast.success('Task submitted for manager review');
      onTaskUpdated();
      onClose();
    } catch (error) {
      console.error('Error completing task:', error);
      toast.error('Failed to complete task');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (taskStatus: string) => {
    switch (taskStatus) {
      case 'SCHEDULED': return 'text-blue-400';
      case 'IN_PROGRESS': return 'text-yellow-400';
      case 'PENDING_REVIEW': return 'text-orange-400';
      case 'COMPLETED': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (taskStatus: string) => {
    switch (taskStatus) {
      case 'SCHEDULED': return <Settings className="w-5 h-5" />;
      case 'IN_PROGRESS': return <AlertCircle className="w-5 h-5" />;
      case 'PENDING_REVIEW': return <AlertCircle className="w-5 h-5" />;
      case 'COMPLETED': return <CheckCircle className="w-5 h-5" />;
      default: return <Settings className="w-5 h-5" />;
    }
  };

  const completedItems = checklist.filter(item => item.completed).length;
  const progressPercentage = checklist.length > 0 ? (completedItems / checklist.length) * 100 : 0;

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {task?.schedule?.title || task?.description || 'Maintenance Task'}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={getStatusColor(status)}>
                {getStatusIcon(status)}
              </span>
              <span className={`text-sm font-medium ${getStatusColor(status)}`}>
                {status}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {/* Task Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Task Details</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Asset:</span> {task?.asset?.name} ({task?.asset?.serialNumber})</p>
                  <p><span className="font-medium">Location:</span> {task?.asset?.location}</p>
                  <p><span className="font-medium">Priority:</span> {task?.priority}</p>
                  <p><span className="font-medium">Scheduled:</span> {new Date(task?.scheduledDate).toLocaleDateString()}</p>
                  {task?.estimatedHours && (
                    <p><span className="font-medium">Estimated Hours:</span> {task.estimatedHours}h</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Progress</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Checklist Progress</span>
                      <span>{completedItems}/{checklist.length} items</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progressPercentage}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Actual Hours
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={actualHours}
                      onChange={(e) => setActualHours(e.target.value ? parseFloat(e.target.value) : '')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="0.0"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Template Information */}
            {task?.schedule?.template && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Template Information</h3>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                    {task.schedule.template.name}
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-200">
                    {task.schedule.template.description}
                  </p>
                  {task.schedule.template.instructions && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">Instructions:</p>
                      <p className="text-sm text-blue-700 dark:text-blue-200 whitespace-pre-wrap">
                        {task.schedule.template.instructions}
                      </p>
                    </div>
                  )}
                  {task.schedule.template.safetyNotes && (
                    <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                      <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-1">⚠️ Safety Notes:</p>
                      <p className="text-sm text-yellow-800 dark:text-yellow-200 whitespace-pre-wrap">
                        {task.schedule.template.safetyNotes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Tools and Parts Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Tools Required */}
                  {task.schedule.template.toolsRequired && Array.isArray(task.schedule.template.toolsRequired) && task.schedule.template.toolsRequired.length > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        🔧 Tools Required ({task.schedule.template.toolsRequired.length})
                      </h4>
                      <ul className="space-y-1">
                        {task.schedule.template.toolsRequired.map((tool: string, index: number) => (
                          <li key={`tool-${index}`} className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0"></div>
                            {typeof tool === 'string' ? tool : String(tool)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Parts Required */}
                  {task.schedule.template.partsRequired && Array.isArray(task.schedule.template.partsRequired) && task.schedule.template.partsRequired.length > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        📦 Parts Required ({task.schedule.template.partsRequired.length})
                      </h4>
                      <ul className="space-y-1">
                        {task.schedule.template.partsRequired.map((part: string, index: number) => (
                          <li key={`part-${index}`} className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0"></div>
                            {typeof part === 'string' ? part : String(part)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Checklist */}
            {checklist.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                  Checklist ({completedItems}/{checklist.length} completed)
                </h3>



                <div className="space-y-2">
                  {Array.isArray(checklist) && checklist.map((item, index) => (
                    <div key={`checklist-${item.id || index}`} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <input
                        type="checkbox"
                        checked={Boolean(item.completed)}
                        onChange={(e) => {
                          console.log('Checkbox clicked for item:', item.id, 'checked:', e.target.checked);
                          updateChecklistItem(item.id || index + 1, e.target.checked);
                        }}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="flex-1">
                        <p className={`text-sm ${item.completed ? 'line-through text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                          {typeof item.task === 'string' ? item.task : String(item.task || 'No task text')}
                        </p>
                        {item.completed && item.completedAt && (
                          <p className="text-xs text-gray-500 mt-1">
                            Completed: {new Date(item.completedAt).toLocaleString()}
                          </p>
                        )}
                        {item.notes && (
                          <p className="text-xs text-gray-400 mt-1">
                            Note: {item.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Add notes about the maintenance work..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end">
              {/* Technician Actions */}
              {session?.user?.role === 'USER' && (
                <>
                  {status === 'SCHEDULED' && (
                    <button
                      onClick={startTask}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Settings className="w-4 h-4" />
                      {saving ? 'Starting...' : 'Start Task'}
                    </button>
                  )}

                  {status === 'IN_PROGRESS' && (
                    <>
                      <button
                        onClick={saveProgress}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                      >
                        <Settings className="w-4 h-4" />
                        {saving ? 'Saving...' : 'Save Progress'}
                      </button>

                      <button
                        onClick={completeTask}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        <CheckCircle className="w-4 h-4" />
                        {saving ? 'Completing...' : 'Complete Task'}
                      </button>
                    </>
                  )}
                </>
              )}

              {/* Manager Actions */}
              {(session?.user?.role === 'MANAGER' || session?.user?.role === 'ADMIN') && (
                <>
                  <button
                    onClick={saveProgress}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Settings className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>

                  {status !== 'COMPLETED' && (
                    <button
                      onClick={completeTask}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {saving ? 'Completing...' : 'Mark Complete'}
                    </button>
                  )}
                </>
              )}

              {status === 'COMPLETED' && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Task Completed</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
