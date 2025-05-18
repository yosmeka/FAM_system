'use client';

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

interface MaintenanceFormSimpleProps {
  assetId: string;
  onSuccess: () => void;
  initialData?: any;
  isEditing?: boolean;
}

export function MaintenanceFormSimple({ 
  assetId, 
  onSuccess, 
  initialData, 
  isEditing = false 
}: MaintenanceFormSimpleProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [description, setDescription] = useState(initialData?.description || '');
  const [priority, setPriority] = useState(initialData?.priority || 'MEDIUM');
  const [status, setStatus] = useState(initialData?.status || 'PENDING');
  const [cost, setCost] = useState(initialData?.cost?.toString() || '');
  const [scheduledDate, setScheduledDate] = useState(
    initialData?.scheduledDate 
      ? new Date(initialData.scheduledDate).toISOString().split('T')[0] 
      : new Date().toISOString().split('T')[0]
  );
  const [completedDate, setCompletedDate] = useState(
    initialData?.completedAt 
      ? new Date(initialData.completedAt).toISOString().split('T')[0] 
      : ''
  );
  const [notes, setNotes] = useState(initialData?.notes || '');
  
  const showCompletedFields = status === 'COMPLETED';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      
      const payload = {
        description,
        priority,
        status,
        cost: cost ? parseFloat(cost) : undefined,
        scheduledDate,
        completedDate,
        notes,
        assetId,
      };
      
      const url = isEditing 
        ? `/api/assets/${assetId}/maintenance/${initialData.id}` 
        : `/api/assets/${assetId}/maintenance`;
      
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save maintenance record');
      }
      
      toast.success(
        isEditing 
          ? 'Maintenance record updated successfully' 
          : 'Maintenance scheduled successfully'
      );
      
      onSuccess();
    } catch (error) {
      console.error('Error saving maintenance record:', error);
      toast.error('Failed to save maintenance record');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description *
        </label>
        <textarea
          id="description"
          rows={3}
          className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2 focus:border-blue-500 focus:ring-blue-500"
          placeholder="Describe the maintenance task"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
            Priority *
          </label>
          <select
            id="priority"
            className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2 focus:border-blue-500 focus:ring-blue-500"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            required
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700">
            Status *
          </label>
          <select
            id="status"
            className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2 focus:border-blue-500 focus:ring-blue-500"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            required
          >
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="scheduledDate" className="block text-sm font-medium text-gray-700">
          Scheduled Date
        </label>
        <input
          type="date"
          id="scheduledDate"
          className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2 focus:border-blue-500 focus:ring-blue-500"
          value={scheduledDate}
          onChange={(e) => setScheduledDate(e.target.value)}
        />
      </div>

      {showCompletedFields && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="completedDate" className="block text-sm font-medium text-gray-700">
                Completion Date
              </label>
              <input
                type="date"
                id="completedDate"
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2 focus:border-blue-500 focus:ring-blue-500"
                value={completedDate}
                onChange={(e) => setCompletedDate(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="cost" className="block text-sm font-medium text-gray-700">
                Cost ($)
              </label>
              <input
                type="number"
                id="cost"
                step="0.01"
                min="0"
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2 focus:border-blue-500 focus:ring-blue-500"
                placeholder="0.00"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
              />
            </div>
          </div>
        </>
      )}

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          Notes
        </label>
        <textarea
          id="notes"
          rows={2}
          className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2 focus:border-blue-500 focus:ring-blue-500"
          placeholder="Additional notes or instructions"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={() => onSuccess()}
          className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Schedule'}
        </button>
      </div>
    </form>
  );
}
