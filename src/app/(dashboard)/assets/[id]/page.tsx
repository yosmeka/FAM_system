'use client';

import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { ArrowLeft, Download } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { usePDF } from 'react-to-pdf';
import { 
  calculateDepreciation, 
  generateChartData, 
  DepreciationMethod, 
  DepreciationResult 
} from '@/utils/depreciation';

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

export default function AssetDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const { canManageAssets } = usePermissions();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [depreciationData, setDepreciationData] = useState<Array<{year: number, value: number}>>([]);
  const [depreciationResults, setDepreciationResults] = useState<DepreciationResult[]>([]);
  
  const { toPDF, targetRef } = usePDF({
    filename: `depreciation-report-${asset?.name || 'asset'}.pdf`,
  });

  // Depreciation settings
  const [usefulLife, setUsefulLife] = useState<number>(5);
  const [salvageValue, setSalvageValue] = useState<number>(0);
  const [depreciationMethod, setDepreciationMethod] = useState<DepreciationMethod>('STRAIGHT_LINE');
  const [depreciationRate, setDepreciationRate] = useState<number>(20);

  useEffect(() => {
    const fetchAsset = async () => {
      try {
        const response = await fetch(`/api/assets/${resolvedParams.id}`);
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
  }, [resolvedParams.id]);

  useEffect(() => {
    if (asset) {
      calculateAssetDepreciation();
    }
  }, [asset, usefulLife, salvageValue, depreciationMethod, depreciationRate]);

  const calculateAssetDepreciation = () => {
    if (!asset) return;
    
    const results = calculateDepreciation({
      purchasePrice: asset.purchasePrice,
      purchaseDate: asset.purchaseDate,
      usefulLife,
      salvageValue: salvageValue || asset.purchasePrice * 0.1, // Default to 10% of purchase price if not set
      method: depreciationMethod,
      depreciationRate
    });
    
    setDepreciationResults(results);
    setDepreciationData(generateChartData(results));
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this asset?')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/assets/${resolvedParams.id}`, {
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
      <div className="bg-red-500 text-white p-4 rounded-md flex flex-col md:flex-row md:items-center md:justify-between mb-4">
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

      {/* Depreciation Section */}
      <div ref={targetRef}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Depreciation</h2>
          <button
            onClick={() => toPDF()}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            <Download size={16} />
            Export PDF
          </button>
        </div>

        {/* Depreciation Settings */}
        <div className="mb-6 bg-gray-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Depreciation Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Depreciation Method</label>
              <select
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={depreciationMethod}
                onChange={(e) => setDepreciationMethod(e.target.value as DepreciationMethod)}
              >
                <option value="STRAIGHT_LINE">Straight Line</option>
                <option value="DECLINING_BALANCE">Declining Balance</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Useful Life (Years)</label>
              <input
                type="number"
                min="1"
                max="50"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={usefulLife}
                onChange={(e) => setUsefulLife(Number(e.target.value))}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Salvage Value</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={salvageValue}
                onChange={(e) => setSalvageValue(Number(e.target.value))}
              />
            </div>
            
            {depreciationMethod === 'DECLINING_BALANCE' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Depreciation Rate (%)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={depreciationRate}
                  onChange={(e) => setDepreciationRate(Number(e.target.value))}
                />
              </div>
            )}
          </div>
        </div>

        {/* Depreciation Details */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Depreciation Details</h2>
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
                  <td className="p-2 border">{formatDate(asset?.purchaseDate)}</td>
                  <td className="p-2 border">{formatCurrency(asset?.purchasePrice || 0)}</td>
                  <td className="p-2 border">{formatCurrency(salvageValue || (asset?.purchasePrice || 0) * 0.1)}</td>
                  <td className="p-2 border">{usefulLife * 12} months</td>
                  <td className="p-2 border">{depreciationMethod === 'STRAIGHT_LINE' ? 'Straight Line' : 'Declining Balance'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Depreciation Chart */}
        <div className="mb-6">
          <h3 className="text-md font-medium mb-2">Depreciation yearly stats…</h3>
          <div className="h-48 bg-white rounded-lg border p-2 mb-4">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart 
                data={depreciationData}
                margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
              >
                <XAxis 
                  dataKey="year" 
                  stroke="#666"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  stroke="#666"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                />
                <Tooltip 
                  formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Value']}
                  labelFormatter={(label) => `Year: ${label}`}
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6, fill: '#2563eb' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Yearly Depreciation Table */}
        <div className="overflow-x-auto text-sm mb-6">
          <h3 className="text-md font-medium mb-2">Yearly Depreciation Schedule</h3>
          <table className="w-full border text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border font-semibold">Year</th>
                <th className="p-2 border font-semibold">Depreciation Expense</th>
                <th className="p-2 border font-semibold">Accumulated Depreciation</th>
                <th className="p-2 border font-semibold">Book Value</th>
              </tr>
            </thead>
            <tbody>
              {depreciationResults.map((result, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="p-2 border">{result.year}</td>
                  <td className="p-2 border">{formatCurrency(result.depreciationExpense)}</td>
                  <td className="p-2 border">{formatCurrency(result.accumulatedDepreciation)}</td>
                  <td className="p-2 border">{formatCurrency(result.bookValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 