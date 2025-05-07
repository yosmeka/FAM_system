'use client';

import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { AssetForm } from '@/components/AssetForm';

export default function NewAssetPage() {
  const { checkPermission } = usePermissions();

  if (!checkPermission('Asset create')) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-semibold text-gray-900">Access Denied</h1>
        <p className="mt-2 text-gray-600">You don't have permission to create assets.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Add New Asset</h1>
        <p className="mt-1 text-sm text-gray-500">Create a new asset in the system</p>
      </div>

      <AssetForm />
    </div>
  );
}
