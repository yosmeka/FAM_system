'use client';

import React, { useState, useEffect } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from 'react-hot-toast';
import { AssetForm } from '@/components/AssetForm';
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

export default function EditAssetPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const { checkPermission } = usePermissions();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [assetData, setAssetData] = useState<any>(null);
  const [isDisposed, setIsDisposed] = useState(false);
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
  useEffect(() => {
    const fetchAsset = async () => {
      try {
        const response = await fetch(`/api/assets/${resolvedParams.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch asset');
        }
        const asset = await response.json();
        setAssetData(asset);

        // Check if asset is disposed
        if (asset.status === 'DISPOSED') {
          setIsDisposed(true);
          return;
        }
      } catch (error) {
        toast.error('Failed to fetch asset details');
        console.error('Error fetching asset:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAsset();
  }, [resolvedParams.id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/assets/${resolvedParams.id}`, {
        method: 'PUT',
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
        throw new Error('Failed to update asset');
      }

      toast.success('Asset updated successfully');
      router.push('/assets');
      router.refresh();
    } catch (error) {
      toast.error('Failed to update asset');
      console.error('Error updating asset:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (!checkPermission('Asset create')) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-semibold text-gray-900">Access Denied</h1>
        <p className="mt-2 text-gray-600">You don't have permission to edit assets.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (isDisposed) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Access Denied</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>This asset cannot be edited. It is a disposed asset.</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => router.push(`/assets/${resolvedParams.id}`)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Back to Asset Detail
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Edit Asset</h1>
        <p className="mt-1 text-sm text-gray-500">
          Update asset information
        </p>
      </div>

      <AssetForm initialData={assetData} isEditing={true} assetId={resolvedParams.id} />
    </div>
  );
}