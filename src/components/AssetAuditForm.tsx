'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';

// Define the schema for audit validation
const auditSchema = z.object({
  auditDate: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: 'Please enter a valid date',
  }),
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'NEEDS_REVIEW']),
  condition: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'CRITICAL', 'MISSING']),
  locationVerified: z.boolean().default(true),
  notes: z.string().optional(),
  discrepancies: z.string().optional(),
  discrepancyResolved: z.boolean().default(false),
  resolvedDate: z.string().optional().nullable(),
  resolvedBy: z.string().optional().nullable(),
  resolutionNotes: z.string().optional().nullable(),
  photoUrls: z.string().optional().nullable(),
  nextAuditDate: z.string().optional().nullable(),
});

type AuditFormData = z.infer<typeof auditSchema>;

interface AssetAuditFormProps {
  assetId: string;
  onSuccess: () => void;
  initialData?: unknown;
  isEditing?: boolean;
}

export function AssetAuditForm({ 
  assetId, 
  onSuccess, 
  initialData, 
  isEditing = false 
}: AssetAuditFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResolutionFields, setShowResolutionFields] = useState(
    (initialData && typeof initialData === 'object' && initialData !== null && 'discrepancyResolved' in initialData ? (initialData as Partial<AuditFormData>).discrepancyResolved : false)
  );

  // Initialize the form with default values or initial data if editing
  const { register, handleSubmit, formState: { errors }, watch, setValue, reset } = useForm<AuditFormData>({
    resolver: zodResolver(auditSchema),
    defaultValues: initialData && typeof initialData === 'object' && initialData !== null ? {
      auditDate: 'auditDate' in initialData && initialData.auditDate ? format(new Date((initialData as Partial<AuditFormData>).auditDate as string), 'yyyy-MM-dd') : '',
      status: 'status' in initialData ? (initialData as Partial<AuditFormData>).status ?? 'COMPLETED' : 'COMPLETED',
      condition: 'condition' in initialData ? (initialData as Partial<AuditFormData>).condition ?? 'GOOD' : 'GOOD',
      locationVerified: 'locationVerified' in initialData ? (initialData as Partial<AuditFormData>).locationVerified ?? true : true,
      notes: 'notes' in initialData ? (initialData as Partial<AuditFormData>).notes ?? '' : '',
      discrepancies: 'discrepancies' in initialData ? (initialData as Partial<AuditFormData>).discrepancies ?? '' : '',
      discrepancyResolved: 'discrepancyResolved' in initialData ? (initialData as Partial<AuditFormData>).discrepancyResolved ?? false : false,
      resolvedDate: 'resolvedDate' in initialData && (initialData as Partial<AuditFormData>).resolvedDate ? format(new Date((initialData as Partial<AuditFormData>).resolvedDate as string), 'yyyy-MM-dd') : null,
      resolvedBy: 'resolvedBy' in initialData ? (initialData as Partial<AuditFormData>).resolvedBy ?? null : null,
      resolutionNotes: 'resolutionNotes' in initialData ? (initialData as Partial<AuditFormData>).resolutionNotes ?? null : null,
      photoUrls: 'photoUrls' in initialData ? (initialData as Partial<AuditFormData>).photoUrls ?? null : null,
      nextAuditDate: 'nextAuditDate' in initialData && (initialData as Partial<AuditFormData>).nextAuditDate ? format(new Date((initialData as Partial<AuditFormData>).nextAuditDate as string), 'yyyy-MM-dd') : null,
    } : {
      auditDate: format(new Date(), 'yyyy-MM-dd'),
      status: 'COMPLETED',
      condition: 'GOOD',
      locationVerified: true,
      discrepancyResolved: false,
      nextAuditDate: format(new Date(new Date().setMonth(new Date().getMonth() + 12)), 'yyyy-MM-dd'), // Default to 1 year from now
    }
  });

  // Watch for changes to discrepancyResolved
  const discrepancyResolved = watch('discrepancyResolved');
  const hasDiscrepancies = (watch('discrepancies') || '').trim().length > 0;

  // Update resolution fields visibility when discrepancyResolved changes
  React.useEffect(() => {
    setShowResolutionFields(discrepancyResolved);
    
    // If discrepancy is resolved, set resolved date to today if not already set
    if (discrepancyResolved && !watch('resolvedDate')) {
      setValue('resolvedDate', format(new Date(), 'yyyy-MM-dd'));
    }
  }, [discrepancyResolved, setValue, watch]);

  const onSubmit = async (data: AuditFormData) => {
    setIsSubmitting(true);
    try {
      let id: string | undefined = undefined;
      if (isEditing && initialData && typeof initialData === 'object' && initialData !== null && 'id' in initialData) {
        id = (initialData as { id?: string }).id;
      }
      const url = isEditing 
        ? `/api/assets/${assetId}/audits/${id}`
        : `/api/assets/${assetId}/audits`;
      
      const method = isEditing ? 'PUT' : 'POST';
      
      // If there are no discrepancies, ensure resolution fields are null
      if (!hasDiscrepancies || !data.discrepancyResolved) {
        data.resolvedDate = null;
        data.resolvedBy = null;
        data.resolutionNotes = null;
      }
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save audit');
      }

      toast.success(isEditing ? 'Audit updated successfully' : 'Audit added successfully');
      reset();
      onSuccess();
    } catch (error) {
      console.error('Error saving audit:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save audit');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Audit Date */}
        <div>
          <label htmlFor="auditDate" className="block text-sm font-medium text-gray-700">
            Audit Date *
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              id="auditDate"
              type="date"
              {...register('auditDate')}
              className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
            />
          </div>
          {errors.auditDate && (
            <p className="mt-1 text-sm text-red-600">{errors.auditDate.message}</p>
          )}
        </div>

        {/* Next Audit Date */}
        <div>
          <label htmlFor="nextAuditDate" className="block text-sm font-medium text-gray-700">
            Next Audit Date
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              id="nextAuditDate"
              type="date"
              {...register('nextAuditDate')}
              className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
            />
          </div>
          {errors.nextAuditDate && (
            <p className="mt-1 text-sm text-red-600">{errors.nextAuditDate.message}</p>
          )}
        </div>

        {/* Status */}
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700">
            Audit Status *
          </label>
          <select
            id="status"
            {...register('status')}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="COMPLETED">Completed</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
            <option value="NEEDS_REVIEW">Needs Review</option>
          </select>
          {errors.status && (
            <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
          )}
        </div>

        {/* Condition */}
        <div>
          <label htmlFor="condition" className="block text-sm font-medium text-gray-700">
            Asset Condition *
          </label>
          <select
            id="condition"
            {...register('condition')}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="EXCELLENT">Excellent</option>
            <option value="GOOD">Good</option>
            <option value="FAIR">Fair</option>
            <option value="POOR">Poor</option>
            <option value="CRITICAL">Critical</option>
            <option value="MISSING">Missing</option>
          </select>
          {errors.condition && (
            <p className="mt-1 text-sm text-red-600">{errors.condition.message}</p>
          )}
        </div>
      </div>

      {/* Location Verified */}
      <div className="flex items-center">
        <input
          id="locationVerified"
          type="checkbox"
          {...register('locationVerified')}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="locationVerified" className="ml-2 block text-sm text-gray-700">
          Location verified
        </label>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          Audit Notes
        </label>
        <textarea
          id="notes"
          {...register('notes')}
          rows={3}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="Enter any notes about the audit"
        />
      </div>

      {/* Discrepancies */}
      <div>
        <label htmlFor="discrepancies" className="block text-sm font-medium text-gray-700">
          Discrepancies
        </label>
        <textarea
          id="discrepancies"
          {...register('discrepancies')}
          rows={3}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="Enter any discrepancies found during the audit"
        />
      </div>

      {/* Discrepancy Resolved */}
      {hasDiscrepancies && (
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              id="discrepancyResolved"
              type="checkbox"
              {...register('discrepancyResolved')}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="discrepancyResolved" className="ml-2 block text-sm text-gray-700">
              Discrepancy resolved
            </label>
          </div>

          {/* Resolution Fields */}
          {showResolutionFields && (
            <div className="pl-6 border-l-2 border-blue-200 space-y-4">
              <div>
                <label htmlFor="resolvedDate" className="block text-sm font-medium text-gray-700">
                  Resolution Date
                </label>
                <input
                  id="resolvedDate"
                  type="date"
                  {...register('resolvedDate')}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="resolvedBy" className="block text-sm font-medium text-gray-700">
                  Resolved By
                </label>
                <input
                  id="resolvedBy"
                  type="text"
                  {...register('resolvedBy')}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Name of person who resolved the discrepancy"
                />
              </div>

              <div>
                <label htmlFor="resolutionNotes" className="block text-sm font-medium text-gray-700">
                  Resolution Notes
                </label>
                <textarea
                  id="resolutionNotes"
                  {...register('resolutionNotes')}
                  rows={3}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter notes about how the discrepancy was resolved"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Photo URLs */}
      <div>
        <label htmlFor="photoUrls" className="block text-sm font-medium text-gray-700">
          Photo URLs (comma-separated)
        </label>
        <input
          id="photoUrls"
          type="text"
          {...register('photoUrls')}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="https://example.com/photo1.jpg, https://example.com/photo2.jpg"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : isEditing ? 'Update Audit' : 'Record Audit'}
        </button>
      </div>
    </form>
  );
}
