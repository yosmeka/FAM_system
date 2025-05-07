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
      } catch (error) {
        toast.error('Failed to fetch asset details');
        console.error('Error fetching asset:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAsset();
  }, [resolvedParams.id]);

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