'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { X, Plus, Trash2, DollarSign, Clock, Wrench, FileText } from 'lucide-react';

interface Part {
  id: string;
  name: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

interface WorkDocumentationModalProps {
  open: boolean;
  onClose: () => void;
  task: any;
  onWorkCompleted: () => void;
}

export default function WorkDocumentationModal({ 
  open, 
  onClose, 
  task, 
  onWorkCompleted 
}: WorkDocumentationModalProps) {
  const [workPerformed, setWorkPerformed] = useState('');
  const [technicianNotes, setTechnicianNotes] = useState('');
  const [laborHours, setLaborHours] = useState('');
  const [laborRate, setLaborRate] = useState('50'); // Default hourly rate
  const [parts, setParts] = useState<Part[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Initialize with existing data if available
  useEffect(() => {
    if (task && open) {
      setWorkPerformed(task.workPerformed || '');
      setTechnicianNotes(task.technicianNotes || '');
      setLaborHours(task.laborHours?.toString() || '');
      
      if (task.partsUsed) {
        try {
          const existingParts = JSON.parse(task.partsUsed);
          setParts(existingParts);
        } catch (e) {
          setParts([]);
        }
      }
    }
  }, [task, open]);

  const addPart = () => {
    const newPart: Part = {
      id: Date.now().toString(),
      name: '',
      quantity: 1,
      unitCost: 0,
      totalCost: 0
    };
    setParts([...parts, newPart]);
  };

  const updatePart = (id: string, field: keyof Part, value: string | number) => {
    setParts(parts.map(part => {
      if (part.id === id) {
        const updatedPart = { ...part, [field]: value };
        if (field === 'quantity' || field === 'unitCost') {
          updatedPart.totalCost = updatedPart.quantity * updatedPart.unitCost;
        }
        return updatedPart;
      }
      return part;
    }));
  };

  const removePart = (id: string) => {
    setParts(parts.filter(part => part.id !== id));
  };

  const calculateTotalPartsCost = () => {
    return parts.reduce((total, part) => total + part.totalCost, 0);
  };

  const calculateLaborCost = () => {
    const hours = parseFloat(laborHours) || 0;
    const rate = parseFloat(laborRate) || 0;
    return hours * rate;
  };

  const calculateTotalCost = () => {
    return calculateTotalPartsCost() + calculateLaborCost();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!workPerformed.trim()) {
      toast.error('Please describe the work performed');
      return;
    }

    if (!laborHours || parseFloat(laborHours) <= 0) {
      toast.error('Please enter the labor hours spent');
      return;
    }

    try {
      setSubmitting(true);
      
      const payload = {
        status: 'WORK_COMPLETED',
        workPerformed: workPerformed.trim(),
        technicianNotes: technicianNotes.trim() || undefined,
        laborHours: parseFloat(laborHours),
        laborCost: calculateLaborCost(),
        partsCost: calculateTotalPartsCost(),
        totalCost: calculateTotalCost(),
        partsUsed: parts.length > 0 ? JSON.stringify(parts) : undefined,
        workCompletedAt: new Date().toISOString(),
      };
      
      const response = await fetch(`/api/maintenance/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit work documentation');
      }
      
      toast.success('Work completed and submitted for manager review!');
      onWorkCompleted();
      onClose();
      
    } catch (error) {
      console.error('Error submitting work documentation:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit work documentation');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !task) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Document Work Completed
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

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Work Description */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Work Performed <span className="text-red-500">*</span>
            </label>
            <textarea
              value={workPerformed}
              onChange={(e) => setWorkPerformed(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Describe in detail what work was performed to fix the issue..."
              required
            />
          </div>

          {/* Labor Hours and Cost */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Labor Hours <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  step="0.5"
                  value={laborHours}
                  onChange={(e) => setLaborHours(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., 2.5"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Labor Rate ($/hour)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  step="0.01"
                  value={laborRate}
                  onChange={(e) => setLaborRate(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="50.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Labor Cost
              </label>
              <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md">
                <span className="text-gray-900 dark:text-white font-medium">
                  ${calculateLaborCost().toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Parts Used */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Parts/Materials Used
              </label>
              <button
                type="button"
                onClick={addPart}
                className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add Part
              </button>
            </div>

            {parts.length > 0 && (
              <div className="space-y-3">
                {parts.map((part) => (
                  <div key={part.id} className="grid grid-cols-1 md:grid-cols-5 gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="md:col-span-2">
                      <input
                        type="text"
                        value={part.name}
                        onChange={(e) => updatePart(part.id, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
                        placeholder="Part name"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        value={part.quantity}
                        onChange={(e) => updatePart(part.id, 'quantity', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
                        placeholder="Qty"
                        min="1"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        step="0.01"
                        value={part.unitCost}
                        onChange={(e) => updatePart(part.id, 'unitCost', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
                        placeholder="Unit cost"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        ${part.totalCost.toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removePart(part.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                
                <div className="flex justify-end">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    Parts Total: ${calculateTotalPartsCost().toFixed(2)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Technician Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Additional Notes
            </label>
            <textarea
              value={technicianNotes}
              onChange={(e) => setTechnicianNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Any additional notes about the work performed..."
            />
          </div>

          {/* Cost Summary */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-600/30 rounded-lg">
            <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-3">Cost Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Labor Cost:</span>
                <span className="font-medium">${calculateLaborCost().toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Parts Cost:</span>
                <span className="font-medium">${calculateTotalPartsCost().toFixed(2)}</span>
              </div>
              <div className="border-t border-blue-200 dark:border-blue-600/30 pt-2 flex justify-between text-lg font-semibold">
                <span>Total Cost:</span>
                <span>${calculateTotalCost().toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              {submitting ? 'Submitting...' : 'Submit for Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
