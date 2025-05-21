'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { MaintenancePriority, MaintenanceStatus } from '@/types/maintenance';

// Define the form schema using Zod
const maintenanceSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const),
  cost: z.string().optional().transform(val => val ? parseFloat(val) : undefined),
  scheduledDate: z.string().optional(),
  completedDate: z.string().optional(),
  notes: z.string().optional(),
});

type MaintenanceFormData = z.infer<typeof maintenanceSchema>;

interface MaintenanceFormProps {
  assetId: string;
  onSuccess: () => void;
  initialData?: any;
  isEditing?: boolean;
}

export function MaintenanceForm({ 
  assetId, 
  onSuccess, 
  initialData, 
  isEditing = false 
}: MaintenanceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCompletedFields, setShowCompletedFields] = useState(
    initialData?.status === 'COMPLETED'
  );

  // Initialize the form with default values or initial data if editing
  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<MaintenanceFormData>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: initialData ? {
      description: initialData.description || '',
      priority: initialData.priority || 'MEDIUM',
      status: initialData.status || 'PENDING',
      cost: initialData.cost ? initialData.cost.toString() : '',
      scheduledDate: initialData.scheduledDate ? new Date(initialData.scheduledDate).toISOString().split('T')[0] : '',
      completedDate: initialData.completedAt ? new Date(initialData.completedAt).toISOString().split('T')[0] : '',
      notes: initialData.notes || '',
    } : {
      priority: 'MEDIUM',
      status: 'PENDING',
      scheduledDate: new Date().toISOString().split('T')[0],
    }
  });

  // Watch the status field to show/hide completed fields
  const status = watch('status');
  if (status === 'COMPLETED' && !showCompletedFields) {
    setShowCompletedFields(true);
  } else if (status !== 'COMPLETED' && showCompletedFields) {
    setShowCompletedFields(false);
  }

  const onSubmit = async (data: MaintenanceFormData) => {
    try {
      setIsSubmitting(true);
      
      const payload = {
        ...data,
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description *
        </label>
        <textarea
          id="description"
          rows={3}
          className={`mt-1 block w-full rounded-md border ${
            errors.description ? 'border-red-300' : 'border-gray-300'
          } shadow-sm p-2 focus:border-blue-500 focus:ring-blue-500`}
          placeholder="Describe the maintenance task"
          {...register('description')}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
            Priority *
          </label>
          <select
            id="priority"
            className={`mt-1 block w-full rounded-md border ${
              errors.priority ? 'border-red-300' : 'border-gray-300'
            } shadow-sm p-2 focus:border-blue-500 focus:ring-blue-500`}
            {...register('priority')}
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
          {errors.priority && (
            <p className="mt-1 text-sm text-red-600">{errors.priority.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700">
            Status *
          </label>
          <select
            id="status"
            className={`mt-1 block w-full rounded-md border ${
              errors.status ? 'border-red-300' : 'border-gray-300'
            } shadow-sm p-2 focus:border-blue-500 focus:ring-blue-500`}
            {...register('status')}
          >
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          {errors.status && (
            <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
          )}
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
          {...register('scheduledDate')}
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
                {...register('completedDate')}
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
                {...register('cost')}
              />
              {errors.cost && (
                <p className="mt-1 text-sm text-red-600">{errors.cost.message}</p>
              )}
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
          {...register('notes')}
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
