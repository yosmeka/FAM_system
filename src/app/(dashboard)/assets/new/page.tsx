'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from 'react-hot-toast';

export default function NewAssetPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { checkPermission, getPermissions } = usePermissions();
  // Debug: Log current permissions
  console.log('Current permissions:', getPermissions());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    serialNumber: '',
    purchaseDate: '',
    purchasePrice: '',
    currentValue: '',
    status: 'ACTIVE',
    location: '',
    department: '',
    category: '',
    supplier: '',
    warrantyExpiry: '',
    lastMaintenance: '',
    nextMaintenance: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          purchasePrice: parseFloat(formData.purchasePrice),
          currentValue: parseFloat(formData.currentValue),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 409 && errorData?.error?.toLowerCase().includes('serial')) {
          toast.error('Serial number must be unique');
        } else {
          throw new Error('Failed to create asset');
        }
        return;
      }

      toast.success('Asset created successfully');
      router.push('/assets');
      router.refresh();
    } catch (error) {
      toast.error('Failed to create asset');
      console.error('Error creating asset:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  if (!checkPermission('Asset create')) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-semibold text-gray-900">Access Denied</h1>
        <p className="mt-2 text-gray-600">You don't have permission to create assets.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Add New Asset</h1>
        <p className="mt-1 text-sm text-gray-500">Create a new asset in the system</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 bg-white dark:bg-gray-900 shadow-md rounded-2xl p-8 border border-red-100"
      >
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Input fields */}
          {[
            { id: 'name', label: 'Asset Name', type: 'text' },
            { id: 'serialNumber', label: 'Serial Number', type: 'text' },
            { id: 'purchaseDate', label: 'Purchase Date', type: 'date' },
            { id: 'purchasePrice', label: 'Purchase Price', type: 'number' },
            { id: 'currentValue', label: 'Current Value', type: 'number' },
            { id: 'location', label: 'Location', type: 'text' },
            { id: 'department', label: 'Department', type: 'text' },
            { id: 'supplier', label: 'Supplier', type: 'text' },
            { id: 'warrantyExpiry', label: 'Warranty Expiry Date', type: 'date' },
            { id: 'lastMaintenance', label: 'Last Maintenance Date', type: 'date' },
            { id: 'nextMaintenance', label: 'Next Maintenance Date', type: 'date' },
          ].map(({ id, label, type }) => (
            <div key={id}>
              <label htmlFor={id} className="block text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1">
                {label}
              </label>
              <input
                type={type}
                name={id}
                id={id}
                required
                value={formData[id as keyof typeof formData] as string | number | undefined}
                onChange={handleChange}
                className="block w-full h-10 px-3 rounded-md border border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-white dark:bg-gray-900 shadow-sm text-sm placeholder:text-gray-400"
                placeholder={`Enter ${label.toLowerCase()}`}
              />
            </div>
          ))}

          {/* Category dropdown */}
          <div>
            <label htmlFor="category" className="block text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1">
              Category
            </label>
            <select
              name="category"
              id="category"
              required
              value={formData.category}
              onChange={handleChange}
              className="block w-full h-10 px-3 rounded-md border border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-white dark:bg-gray-900 hover:bg-gray-100 shadow-sm text-sm"
            >
              <option value="">Select category</option>
              <option value="Computer">Computer</option>
              <option value="Furniture">Furniture</option>
              <option value="Vehicle">Vehicle</option>
              <option value="Electronics">Electronics</option>
              <option value="Office Equipment">Office Equipment</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Status dropdown */}
          <div>
            <label htmlFor="status" className="block text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1">
              Status
            </label>
            <select
              name="status"
              id="status"
              required
              value={formData.status}
              onChange={handleChange}
              className="block w-full h-10 px-3 rounded-md border border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-white dark:bg-gray-900 hover:bg-gray-100 shadow-sm text-sm"
            >
              <option value="">Select status</option>
              <option value="ACTIVE">Active</option>
              <option value="UNDER_MAINTENANCE">Under Maintenance</option>
              <option value="TRANSFERRED">Transferred</option>
              <option value="DISPOSED">Disposed</option>
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1">
            Description
          </label>
          <textarea
            name="description"
            id="description"
            rows={3}
            value={formData.description}
            onChange={handleChange}
            placeholder="Add a short description of the asset..."
            className="block w-full px-3 py-2 rounded-md border border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-white dark:bg-gray-900 hover:bg-gray-100 shadow-sm text-sm"
          />
        </div>

        {/* Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-400"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Create Asset'}
          </button>
        </div>
      </form>
    </div>
  );
}
