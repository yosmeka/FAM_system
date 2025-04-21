'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

interface Asset {
  id: string;
  name: string;
  description: string;
  serialNumber: string;
  purchaseDate: string;
  purchasePrice: number;
  currentValue: number;
  status: string;
  location: string;
  department: string;
  category: string;
  supplier: string;
  warrantyExpiry: string | null;
  lastMaintenance: string | null;
  nextMaintenance: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AssetDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: session } = useSession();
  const { canManageAssets } = usePermissions();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [depreciationData, setDepreciationData] = useState<Array<{year: number, value: number}>>([]);

  useEffect(() => {
    const fetchAsset = async () => {
      try {
        const response = await fetch(`/api/assets/${params.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch asset');
        }
        const data = await response.json();
        setAsset(data);
      } catch (error) {
        toast.error('Failed to fetch asset details');
        console.error('Error fetching asset:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAsset();
  }, [params.id]);

  useEffect(() => {
    if (asset) {
      // Generate depreciation data for the chart
      const purchaseYear = new Date(asset.purchaseDate).getFullYear();
      const data = [];
      for (let i = 0; i < 5; i++) {
        data.push({
          year: purchaseYear + i,
          value: asset.purchasePrice * (1 - (i * 0.2))
        });
      }
      setDepreciationData(data);
    }
  }, [asset]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this asset?')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/assets/${params.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete asset');
      }

      toast.success('Asset deleted successfully');
      router.push('/assets');
      router.refresh();
    } catch (error) {
      toast.error('Failed to delete asset');
      console.error('Error deleting asset:', error);
    } finally {
      setIsDeleting(false);
    }
  };

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

  if (!asset) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-semibold text-gray-900">Asset Not Found</h1>
        <p className="mt-2 text-gray-600">The requested asset could not be found.</p>
      </div>
    );
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'text-green-600';
      case 'UNDER_MAINTENANCE':
        return 'text-yellow-600';
      case 'TRANSFERRED':
        return 'text-blue-600';
      case 'DISPOSED':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 bg-white shadow-md rounded-lg">
      {/* Header Bar */}
      <div className="bg-blue-600 text-white p-4 rounded-md flex flex-col md:flex-row md:items-center md:justify-between mb-4">
        <div className="flex items-center gap-4 mb-2 md:mb-0">
          <ArrowLeft className="cursor-pointer" onClick={() => router.back()} />
          <div>
            <h1 className="text-lg font-semibold">{asset.name}</h1>
            <p className="text-sm">Asset Tag ID: {asset.serialNumber} • Site: {asset.location}</p>
          </div>
        </div>
        {canManageAssets() && (
          <button 
            onClick={() => router.push(`/assets/${asset.id}/edit`)}
            className="bg-white text-blue-600 px-4 py-2 rounded-md font-medium hover:bg-blue-50"
          >
            Edit
          </button>
        )}
      </div>

      {/* Asset Info Section */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="w-48 h-48 bg-gray-100 border rounded flex items-center justify-center">
          <span className="text-gray-400">No image</span>
        </div>
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div>
            <p><span className="font-semibold">Asset Tag ID:</span> {asset.serialNumber}</p>
            <p><span className="font-semibold">Purchase Date:</span> {formatDate(asset.purchaseDate)}</p>
            <p><span className="font-semibold">Cost:</span> {formatCurrency(asset.purchasePrice)}</p>
            <p><span className="font-semibold">Brand:</span> {asset.supplier || 'Not specified'}</p>
            <p><span className="font-semibold">Model:</span> {asset.name}</p>
          </div>
          <div>
            <p><span className="font-semibold">Site:</span> {asset.location || 'Not specified'}</p>
            <p><span className="font-semibold">Location:</span> {asset.location || 'Not specified'}</p>
            <p><span className="font-semibold">Category:</span> {asset.category || 'Not specified'}</p>
            <p><span className="font-semibold">Department:</span> {asset.department || 'Not specified'}</p>
            <p><span className="font-semibold">Status:</span> <span className={`${getStatusColor(asset.status)} font-semibold`}>{asset.status.replace('_', ' ')}</span></p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b mb-4 flex gap-4 text-sm overflow-x-auto">
        <button className="py-2 border-b-2 border-yellow-500 font-medium">Depreciation</button>
        <button className="py-2">Details</button>
        <button className="py-2">Events</button>
        <button className="py-2">Photos</button>
        <button className="py-2">Docs</button>
        <button className="py-2">Warranty</button>
        <button className="py-2">Linking</button>
        <button className="py-2">Maint.</button>
        <button className="py-2">Contracts</button>
        <button className="py-2">Reserve</button>
        <button className="py-2">Audit</button>
        <button className="py-2">History</button>
      </div>

      {/* Depreciation Details */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Depreciation</h2>
        <div className="overflow-x-auto text-sm">
          <table className="w-full border text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">Date Acquired</th>
                <th className="p-2 border">Depreciable Cost</th>
                <th className="p-2 border">Salvage Value</th>
                <th className="p-2 border">Asset Life (months)</th>
                <th className="p-2 border">Depr. Method</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2 border">{formatDate(asset.purchaseDate)}</td>
                <td className="p-2 border">{formatCurrency(asset.purchasePrice)}</td>
                <td className="p-2 border">{formatCurrency(asset.purchasePrice * 0.1)}</td>
                <td className="p-2 border">60 months</td>
                <td className="p-2 border">Straight Line</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Yearly Depreciation Table */}
      <div className="mb-6">
        <h3 className="text-md font-medium mb-2">Depreciation yearly stats…</h3>
        <div className="h-48 bg-blue-100 rounded-lg flex items-center justify-center text-gray-500 mb-4">
        <ResponsiveContainer width="100%" height={200}>
              <LineChart data={depreciationData}>
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
        </div>
        <div className="overflow-x-auto text-sm">
          <table className="w-full border text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">Year</th>
                <th className="p-2 border">Depreciation expense</th>
                <th className="p-2 border">Accumulated depreciation at year-end</th>
                <th className="p-2 border">Book value at year-end</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2 border">{new Date(asset.purchaseDate).getFullYear()}</td>
                <td className="p-2 border">{formatCurrency(asset.purchasePrice * 0.2)}</td>
                <td className="p-2 border">{formatCurrency(asset.purchasePrice * 0.2)}</td>
                <td className="p-2 border">{formatCurrency(asset.purchasePrice * 0.8)}</td>
              </tr>
              <tr>
                <td className="p-2 border">{new Date(asset.purchaseDate).getFullYear() + 1}</td>
                <td className="p-2 border">{formatCurrency(asset.purchasePrice * 0.2)}</td>
                <td className="p-2 border">{formatCurrency(asset.purchasePrice * 0.4)}</td>
                <td className="p-2 border">{formatCurrency(asset.purchasePrice * 0.6)}</td>
              </tr>
              <tr>
                <td className="p-2 border">{new Date(asset.purchaseDate).getFullYear() + 2}</td>
                <td className="p-2 border">{formatCurrency(asset.purchasePrice * 0.2)}</td>
                <td className="p-2 border">{formatCurrency(asset.purchasePrice * 0.6)}</td>
                <td className="p-2 border">{formatCurrency(asset.purchasePrice * 0.4)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 