'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';

// Define the schema for capital improvement validation
const capitalImprovementSchema = z.object({
  description: z.string().min(3, 'Description must be at least 3 characters'),
  improvementDate: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: 'Please enter a valid date',
  }),
  cost: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: 'Cost must be a positive number',
  }),
  notes: z.string().optional(),
});

type CapitalImprovementFormData = z.infer<typeof capitalImprovementSchema>;

interface CapitalImprovementFormProps {
  assetId: string;
  onSuccess: () => void;
  initialData?: any;
  isEditing?: boolean;
}

export function CapitalImprovementForm({
  assetId,
  onSuccess,
  initialData,
  isEditing = false
}: CapitalImprovementFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize the form with default values or initial data if editing
  const { register, handleSubmit, formState: { errors }, reset } = useForm<CapitalImprovementFormData>({
    resolver: zodResolver(capitalImprovementSchema),
    defaultValues: initialData ? {
      description: initialData.description,
      improvementDate: initialData.improvementDate ? new Date(initialData.improvementDate).toISOString().split('T')[0] : '',
      cost: initialData.cost.toString(),
      notes: initialData.notes || '',
    } : {
      improvementDate: new Date().toISOString().split('T')[0],
    }
  });

  const onSubmit = async (data: CapitalImprovementFormData) => {
    setIsSubmitting(true);
    try {
      const url = isEditing
        ? `/api/assets/${assetId}/capital-improvements/${initialData.id}`
        : `/api/assets/${assetId}/capital-improvements`;

      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save capital improvement');
      }

      toast.success(isEditing ? 'Capital improvement updated successfully' : 'Capital improvement added successfully');
      reset();
      onSuccess();
    } catch (error) {
      console.error('Error saving capital improvement:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save capital improvement');
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
        <input
          id="description"
          type="text"
          {...register('description')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="e.g., New luxury lighting system"
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="improvementDate" className="block text-sm font-medium text-gray-700">
          Improvement Date *
        </label>
        <input
          id="improvementDate"
          type="date"
          {...register('improvementDate')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
        {errors.improvementDate && (
          <p className="mt-1 text-sm text-red-600">{errors.improvementDate.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="cost" className="block text-sm font-medium text-gray-700">
          Cost *
        </label>
        <div className="relative mt-1 rounded-md shadow-sm">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <span className="text-gray-500 sm:text-sm">$</span>
          </div>
          <input
            id="cost"
            type="number"
            step="0.01"
            {...register('cost')}
            className="block w-full rounded-md border-gray-300 pl-7 pr-12 focus:border-blue-500 focus:ring-blue-500"
            placeholder="0.00"
          />
        </div>
        {errors.cost && (
          <p className="mt-1 text-sm text-red-600">{errors.cost.message}</p>
        )}
      </div>



      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          Notes
        </label>
        <textarea
          id="notes"
          {...register('notes')}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="Additional details about the improvement"
        />
        {errors.notes && (
          <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : isEditing ? 'Update Improvement' : 'Add Improvement'}
        </button>
      </div>
    </form>
  );
}
