'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ChecklistItem {
  id: string;
  task: string;
  completed: boolean;
  notes: string;
  completedAt?: string;
}

type ChecklistRawItem = ChecklistItem | string | Record<string, string>;

interface TemplateChecklistTask {
  id: string;
  checklistItems?: ChecklistRawItem[] | string | object;
  asset?: {
    name?: string;
    serialNumber?: string;
    location?: string;
  };
  description?: string;
  priority?: string;
  estimatedHours?: number;
}

interface TemplateChecklistModalProps {
  open: boolean;
  onClose: () => void;
  task: TemplateChecklistTask;
  onTaskCompleted: () => void;
}

export default function TemplateChecklistModal({
  open,
  onClose,
  task,
  onTaskCompleted,
}: TemplateChecklistModalProps) {
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && task?.checklistItems) {
      try {

        // Handle multiple data formats
        let items: ChecklistRawItem[] = [];

        if (typeof task.checklistItems === 'string') {
          // String format - needs parsing
          try {
            items = JSON.parse(task.checklistItems);
          } catch (parseError) {
            console.error('Failed to parse JSON string:', parseError);
            setChecklistItems([]);
            return;
          }
        } else if (Array.isArray(task.checklistItems)) {
          // Already an array
          items = task.checklistItems;
        } else if (typeof task.checklistItems === 'object' && task.checklistItems !== null) {
          // Object format - might be corrupted data

          // Try to extract array from object keys
          const keys = Object.keys(task.checklistItems);
          const numericKeys = keys.filter(key => !isNaN(Number(key))).sort((a, b) => Number(a) - Number(b));

          if (numericKeys.length > 0) {
            // Extract values from numeric keys
            items = numericKeys.map(key => {
              const value = (task.checklistItems as Record<string, unknown>)[key];
              // If value is an object, return as is, else treat as string
              return typeof value === 'object' && value !== null ? value as Record<string, string> : String(value);
            });
          } else {
            console.error('Cannot extract array from object:', task.checklistItems);
            setChecklistItems([]);
            return;
          }
        } else {
          console.error('Unexpected checklistItems format:', typeof task.checklistItems, task.checklistItems);
          setChecklistItems([]);
          return;
        }

        // Ensure items is an array
        if (!Array.isArray(items)) {
          console.error('Items is not an array after processing:', items);
          setChecklistItems([]);
          return;
        }

        // Process each item to ensure proper structure
        const processedItems = items.map((item, index) => {
          if (typeof item === 'string') {
            // String format: "check oil"
            return {
              id: `item-${index}`,
              task: item,
              completed: false,
              notes: '',
              completedAt: undefined
            };
          } else if (typeof item === 'object' && item !== null) {
            // Check if this is a character-by-character object like {0: 'c', 1: 'h', 2: 'e', ...}
            const numericKeys = Object.keys(item).filter(key => !isNaN(Number(key))).sort((a, b) => Number(a) - Number(b));

            if (numericKeys.length > 0) {
              // Reconstruct string from character objects
              const reconstructedString = numericKeys.map(key => (item as Record<string, string>)[key]).join('');

              return {
                id: (item as any).id || `item-${index}`,
                task: reconstructedString,
                completed: Boolean((item as any).completed),
                notes: (item as any).notes || '',
                completedAt: (item as any).completedAt || undefined
              };
            } else {
              // Normal object format: {id, task, completed, notes}
              const obj = item as Partial<ChecklistItem> & { name?: string };
              return {
                id: obj.id || `item-${index}`,
                task: obj.task || obj.name || `Task ${index + 1}`,
                completed: Boolean(obj.completed),
                notes: obj.notes || '',
                completedAt: obj.completedAt || undefined
              };
            }
          } else {
            // Fallback
            return {
              id: `item-${index}`,
              task: `Task ${index + 1}`,
              completed: false,
              notes: '',
              completedAt: undefined
            };
          }
        });

        setChecklistItems(processedItems);
      } catch (error) {
        console.error('Error processing checklist items:', error);
        setChecklistItems([]);
      }
    } else if (open) {
      // Reset when modal opens without task data
      setChecklistItems([]);
    }
  }, [open, task]);

  const handleItemToggle = (itemId: string) => {
    setChecklistItems(prevItems => {
      // Create a completely new array to ensure React detects the change
      return prevItems.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            completed: !item.completed,
            completedAt: !item.completed ? new Date().toISOString() : undefined
          };
        }
        // Return a new object for all items to ensure immutability
        return { ...item };
      });
    });
  };

  const handleItemNotesChange = (itemId: string, notes: string) => {
    setChecklistItems(prev => 
      prev.map(item => 
        item.id === itemId ? { ...item, notes } : item
      )
    );
  };

  const getCompletionPercentage = () => {
    if (checklistItems.length === 0) return 0;
    const completed = checklistItems.filter(item => item.completed).length;
    return Math.round((completed / checklistItems.length) * 100);
  };

  const canCompleteTask = () => {
    return checklistItems.length > 0; // Allow completion even if not all items are checked
  };

  const handleCompleteTask = async () => {
    // No validation needed - technician can submit partial completion
    // Manager will review and decide if work is acceptable

    try {
      setLoading(true);
      
      const response = await fetch(`/api/maintenance/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'WORK_COMPLETED',
          checklistItems: JSON.stringify(checklistItems),
          notes: notes.trim() || undefined,
          workCompletedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to complete task');
      }

      toast.success('Task completed and submitted for manager review!');
      onTaskCompleted();
      onClose();
    } catch (error) {
      console.error('Error completing task:', error);
      toast.error('Failed to complete task');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div 
        className="rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        style={{ backgroundColor: '#2A2D3E' }}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-600">
          <div>
            <h2 className="text-xl font-bold text-white">Complete Maintenance Task</h2>
            <p className="text-gray-400 mt-1">
              {task?.asset?.name} - {task?.description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-white">Progress</span>
              <span className="text-sm text-gray-400">{getCompletionPercentage()}% Complete</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-300"
                style={{
                  backgroundColor: '#2697FF',
                  width: `${getCompletionPercentage()}%`
                }}
              ></div>
            </div>
          </div>

          {/* Task Information */}
          <div className="mb-6 p-4 bg-gray-700 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-2">Task Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Asset:</span>
                <span className="text-white ml-2">{task?.asset?.name}</span>
              </div>
              <div>
                <span className="text-gray-400">Location:</span>
                <span className="text-white ml-2">{task?.asset?.location}</span>
              </div>
              <div>
                <span className="text-gray-400">Priority:</span>
                <span className="text-white ml-2">{task?.priority}</span>
              </div>
              <div>
                <span className="text-gray-400">Estimated Time:</span>
                <span className="text-white ml-2">{task?.estimatedHours}h</span>
              </div>
            </div>
          </div>

          {/* Checklist Items */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Maintenance Checklist</h3>
            <div className="space-y-4">
              {checklistItems.map((item, index) => (
                <div
                  key={`${item.id}-${index}`}
                  className={`p-4 rounded-lg border transition-colors ${
                    item.completed
                      ? 'bg-green-900/20 border-green-600/30'
                      : 'bg-gray-700 border-gray-600'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleItemToggle(item.id);
                      }}
                      className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors cursor-pointer ${
                        item.completed
                          ? 'bg-green-600 border-green-600 text-white'
                          : 'border-gray-400 hover:border-gray-300'
                      }`}
                    >
                      {item.completed && (
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <p className={`font-medium ${item.completed ? 'text-green-400' : 'text-white'}`}>
                        {index + 1}. {item.task}
                      </p>
                      
                      {item.completed && item.completedAt && (
                        <p className="text-xs text-green-400 mt-1">
                          Completed: {new Date(item.completedAt).toLocaleString()}
                        </p>
                      )}
                      
                      <textarea
                        value={item.notes}
                        onChange={(e) => handleItemNotesChange(item.id, e.target.value)}
                        placeholder="Add notes (optional)..."
                        className="w-full mt-2 p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm resize-none"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-white mb-2">
              Additional Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional observations or notes about the maintenance work..."
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white resize-none"
              rows={4}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-600">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-green-400">
              Complete what you can and submit for manager review
            </span>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCompleteTask}
              disabled={!canCompleteTask() || loading}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
                canCompleteTask() && !loading
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Completing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Complete Task
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
