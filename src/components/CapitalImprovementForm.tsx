'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { Plus } from 'lucide-react';
import { calculateDepreciation, DepreciationMethod } from '@/utils/depreciation';

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
  currentAssetValue: z.string().optional(),
});

type CapitalImprovementFormData = z.infer<typeof capitalImprovementSchema>;

interface CapitalImprovement {
  id?: string;
  description?: string;
  improvementDate?: string;
  cost?: number;
  notes?: string | null;
}

interface Asset {
  id: string;
  name: string;
  purchaseDate: string;
  purchasePrice: number;
  currentValue: number;
  depreciableCost?: number;
  salvageValue?: number;
  usefulLifeMonths?: number;
  depreciationMethod?: DepreciationMethod;
  depreciationStartDate?: string;
}

interface CapitalImprovementFormProps {
  assetId: string;
  onSuccess: () => void;
  initialData?: CapitalImprovement;
  isEditing?: boolean;
}

export function CapitalImprovementForm({
  assetId,
  onSuccess,
  initialData,
  isEditing = false
}: CapitalImprovementFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [asset, setAsset] = useState<Asset | null>(null);

  // Initialize the form with default values or initial data if editing
  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<CapitalImprovementFormData>({
    resolver: zodResolver(capitalImprovementSchema),
    defaultValues: initialData ? {
      description: initialData.description || '',
      improvementDate: initialData.improvementDate ? new Date(initialData.improvementDate).toISOString().split('T')[0] : '',
      cost: initialData.cost ? initialData.cost.toString() : '',
      notes: initialData.notes || '',
      currentAssetValue: '',
    } : {
      improvementDate: new Date().toISOString().split('T')[0],
      currentAssetValue: '',
    }
  });

  // Watch the improvement date to use in calculations
  const improvementDate = watch('improvementDate');

  // Fetch asset data when component mounts
  useEffect(() => {
    const fetchAsset = async () => {
      try {
        const response = await fetch(`/api/assets/${assetId}`);
        if (!response.ok) throw new Error('Failed to fetch asset');
        const data = await response.json();
        setAsset(data);
      } catch (error) {
        console.error('Error fetching asset:', error);
        toast.error('Failed to fetch asset details');
      }
    };

    fetchAsset();
  }, [assetId]);

  // Function to calculate the current depreciated cost of the asset
  const calculateCurrentValue = async () => {
    if (!asset) {
      toast.error('Asset data not available');
      return;
    }

    setIsCalculating(true);
    try {
      // Get the improvement date from the form
      const impDate = improvementDate || new Date().toISOString().split('T')[0];

      // Calculate the current depreciated cost based on depreciation
      const depreciatedCost = await calculateAssetCurrentValue(asset, impDate);

      // Format and set the current value in the form
      setValue('currentAssetValue', formatCurrency(depreciatedCost));

      toast.success('Current depreciated cost calculated');
    } catch (error) {
      console.error('Error calculating depreciated cost:', error);
      toast.error('Failed to calculate depreciated cost');
    } finally {
      setIsCalculating(false);
    }
  };

  // Function to calculate the current value based on depreciation
  const calculateAssetCurrentValue = async (asset: Asset, calculationDate: string): Promise<number> => {
    // If the asset doesn't have depreciation settings, return the current value
    if (!asset.depreciationMethod || !asset.usefulLifeMonths || !asset.depreciableCost) {
      return asset.currentValue;
    }

    try {
      // Calculate years from months
      const usefulLifeYears = Math.ceil(asset.usefulLifeMonths / 12);

      // Use sivDate as the single source for depreciation start date
      const startDate = asset.sivDate || asset.purchaseDate;

      // Calculate depreciation
      const depreciationInput = {
        purchasePrice: asset.depreciableCost || asset.purchasePrice,
        purchaseDate: startDate,
        usefulLife: usefulLifeYears,
        salvageValue: asset.salvageValue || 0,
        method: asset.depreciationMethod,
      };

      const depreciationResults = calculateDepreciation(depreciationInput);

      // Calculate how many years have passed since purchase
      const purchaseDate = new Date(startDate);
      const targetDate = new Date(calculationDate);
      const yearsPassed = targetDate.getFullYear() - purchaseDate.getFullYear();

      // If the target date is before the purchase date, return the purchase price
      if (yearsPassed < 0) {
        return asset.purchasePrice;
      }

      // If we've passed the useful life, return the salvage value
      if (yearsPassed >= usefulLifeYears) {
        return asset.salvageValue || 0;
      }

      // Find the book value for the current year
      const currentYearResult = depreciationResults.find(r => r.year === purchaseDate.getFullYear() + yearsPassed);

      // If we found a result, return the book value, otherwise return the current value
      return currentYearResult ? currentYearResult.bookValue : asset.currentValue;
    } catch (error) {
      console.error('Error in depreciation calculation:', error);
      // If there's an error in calculation, return the current value
      return asset.currentValue;
    }
  };

  // Format currency for display
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const onSubmit = async (data: CapitalImprovementFormData) => {
    setIsSubmitting(true);
    try {
      const url = isEditing && initialData?.id
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Description *
        </label>
        <input
          id="description"
          type="text"
          {...register('description')}
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-red-500 focus:ring-red-500"
          placeholder="e.g., New luxury lighting system"
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="improvementDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Improvement Date *
        </label>
        <input
          id="improvementDate"
          type="date"
          {...register('improvementDate')}
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-red-500 focus:ring-red-500"
        />
        {errors.improvementDate && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.improvementDate.message}</p>
        )}
      </div>

      {/* Current Depreciated Cost Section */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label htmlFor="currentAssetValue" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Current Depreciated Cost (Before Improvement)
          </label>
          <button
            type="button"
            onClick={calculateCurrentValue}
            disabled={isCalculating || !asset}
            className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
          >
            <Plus size={16} className="mr-1" />
            {isCalculating ? 'Calculating...' : 'Calculate'}
          </button>
        </div>
        <div className="relative mt-1 rounded-md shadow-sm">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <span className="text-gray-500 dark:text-gray-400 sm:text-sm">$</span>
          </div>
          <input
            id="currentAssetValue"
            type="text"
            {...register('currentAssetValue')}
            readOnly
            className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 pl-7 pr-12 focus:border-red-500 focus:ring-red-500 bg-gray-100 dark:bg-gray-800"
            placeholder="Click 'Calculate' to determine current depreciated cost"
          />
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          This is the calculated depreciated cost of the asset based on depreciation up to the improvement date.
          The improvement cost will be added to this value to update the depreciable cost.
        </p>
      </div>

      <div>
        <label htmlFor="cost" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Improvement Cost *
        </label>
        <div className="relative mt-1 rounded-md shadow-sm">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <span className="text-gray-500 dark:text-gray-400 sm:text-sm">$</span>
          </div>
          <input
            id="cost"
            type="number"
            step="0.01"
            {...register('cost')}
            className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 pl-7 pr-12 focus:border-red-500 focus:ring-red-500"
            placeholder="0.00"
          />
        </div>
        {errors.cost && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.cost.message}</p>
        )}
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          This cost will be added to the current depreciated cost to update the depreciable cost of the asset.
        </p>
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Notes
        </label>
        <textarea
          id="notes"
          {...register('notes')}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-red-500 focus:ring-red-500"
          placeholder="Additional details about the improvement"
        />
        {errors.notes && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.notes.message}</p>
        )}
      </div>

      <div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {asset && (
            <p>
              Asset: <span className="font-medium text-gray-900 dark:text-gray-100">{asset.name || assetId}</span>
              {asset.purchaseDate && (
                <> • Purchased: <span className="font-medium text-gray-900 dark:text-gray-100">{new Date(asset.purchaseDate).toLocaleDateString()}</span></>
              )}
              {asset.depreciableCost && (
                <> • Current Depreciable Cost: <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(asset.depreciableCost)}</span></>
              )}
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex justify-center rounded-md border border-transparent bg-red-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : isEditing ? 'Update Improvement' : 'Add Improvement'}
        </button>
      </div>
    </form>
  );
}
