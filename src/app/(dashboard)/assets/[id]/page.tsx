'use client';

import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { LinkAssetModal } from '@/components/LinkAssetModal';
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
import type { LinkedAsset } from '@/types';



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
  type: string;
  supplier: string;
  warrantyExpiry: string | null;
  lastMaintenance: string | null;
  nextMaintenance: string | null;
  createdAt: string;
  updatedAt: string;
  linkedTo: LinkedAsset[];
  depreciations: Array<{
    usefulLife: number;
  }>;
}

export default function AssetDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: session } = useSession();
  const { canManageAssets } = usePermissions();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  const [isLinkingAsset, setIsLinkingAsset] = useState(false);
  const [availableAssets, setAvailableAssets] = useState<Asset[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [depreciationData, setDepreciationData] = useState<Array<{year: number, value: number}>>([]);
  const [depreciationResults, setDepreciationResults] = useState<DepreciationResult[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  
  const { toPDF, targetRef } = usePDF({
    filename: `depreciation-report-${asset?.name || 'asset'}.pdf`,
  });

  // Depreciation settings
  const [usefulLife, setUsefulLife] = useState<number>(5);
  const [salvageValue, setSalvageValue] = useState<number>(0);
  const [depreciationMethod, setDepreciationMethod] = useState<DepreciationMethod>('STRAIGHT_LINE');
  const [depreciationRate, setDepreciationRate] = useState<number>(20);

  const fetchAvailableAssets = async () => {
    setIsLoadingAssets(true);
    try {
      const response = await fetch('/api/assets/available');
      if (!response.ok) throw new Error('Failed to fetch available assets');
      const data = await response.json();
      // Filter out the current asset from the available assets
      const filteredAssets = data.filter((a: Asset) => a.id !== params.id);
      setAvailableAssets(filteredAssets);
    } catch (error) {
      console.error('Error fetching available assets:', error);
    } finally {
      setIsLoadingAssets(false);
    }
  };

  // Fetch initial asset data
  useEffect(() => {
    const fetchAsset = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/assets/${params.id}`);
        if (!response.ok) throw new Error('Failed to fetch asset');
        const data = await response.json();
        setAsset(data);
      } catch (error) {
        console.error('Error fetching asset:', error);
        toast.error('Failed to fetch asset details');
      } finally {
        setIsLoading(false);
      }
    };
    fetchAsset();
  }, [params.id]);

  // Handle tab changes and data fetching
  useEffect(() => {
    const fetchTabData = async () => {
      if (!asset) return;

      switch (activeTab) {
        case 'linking':
          if (isLinkingAsset) {
            setIsLoadingAssets(true);
            try {
              const response = await fetch('/api/assets');
              if (!response.ok) throw new Error('Failed to fetch assets');
              const data = await response.json();
              // Filter out current asset and already linked assets
              const filteredAssets = data.filter((a: Asset) => 
                a.id !== params.id && 
                !asset?.linkedTo?.some(link => link.toAsset.id === a.id)
              );
              setAvailableAssets(filteredAssets);
            } catch (error) {
              console.error('Error fetching assets:', error);
              toast.error('Failed to load available assets');
            } finally {
              setIsLoadingAssets(false);
            }
          }
          break;

        case 'history':
          setIsHistoryLoading(true);
          try {
            const response = await fetch(`/api/assets/${params.id}/history`);
            if (!response.ok) throw new Error('Failed to fetch history');
            const data = await response.json();
            setHistory(data);
          } catch (error) {
            console.error('Error fetching history:', error);
            toast.error('Failed to fetch asset history');
          } finally {
            setIsHistoryLoading(false);
          }
          break;

        case 'depreciation':
          const results = calculateDepreciation({
            purchasePrice: asset.purchasePrice,
            purchaseDate: asset.purchaseDate,
            salvageValue,
            usefulLife,
            method: depreciationMethod,
            depreciationRate: depreciationRate
          });
          setDepreciationResults(results);
          setDepreciationData(generateChartData(results));
          break;
      }
    };

    fetchTabData();
  }, [activeTab, params.id, asset, isLinkingAsset, salvageValue, usefulLife, depreciationMethod, depreciationRate]);

  const handleLinkSuccess = () => {
    // Refetch the asset to get updated linked assets
    const fetchAsset = async () => {
      try {
        const response = await fetch(`/api/assets/${params.id}`);
        if (!response.ok) throw new Error('Failed to fetch asset');
        const data = await response.json();
        setAsset(data);
      } catch (error) {
        console.error('Error fetching asset:', error);
      }
    };

    fetchAsset();
  };

  useEffect(() => {
    if (asset) {
      calculateAssetDepreciation();
    }
  }, [asset, usefulLife, salvageValue, depreciationMethod, depreciationRate]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (activeTab === 'history') {
        setIsHistoryLoading(true);
        try {
          const response = await fetch(`/api/assets/${params.id}/history`);
          if (!response.ok) throw new Error('Failed to fetch history');
          const data = await response.json();
          setHistory(data);
        } catch (error) {
          console.error('Error fetching history:', error);
          toast.error('Failed to load asset history');
        } finally {
          setIsHistoryLoading(false);
        }
      }
    };

    fetchHistory();
  }, [activeTab, params.id]);

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
    }
  };

  const renderHistoryTab = () => {
    if (isHistoryLoading) {
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
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Asset History</h2>
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Field
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Changed from
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Changed to
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Changed by
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {history.map((record, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(record.changedAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.field}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.oldValue || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.newValue || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.changedBy || 'System'}
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    No history records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderLinkingTab = () => {
    const totalValue = asset?.linkedTo?.reduce<number>((sum, link) => sum + link.toAsset.purchasePrice, 0) || 0;
    const totalDepreciation = asset?.linkedTo?.reduce<number>((sum, link) => {
      const depreciationToDate = link.toAsset.purchasePrice - link.toAsset.currentValue;
      return sum + depreciationToDate;
    }, 0) || 0;

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold">Linked Assets for: {asset?.name}</h2>
          <button
            onClick={() => setIsLinkingAsset(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            + Link New Asset
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acquisition</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Useful Life</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Depreciation to Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {asset?.linkedTo?.map((link) => {
                const linkedAsset = link.toAsset;
                const depreciationToDate = linkedAsset.purchasePrice - linkedAsset.currentValue;
                return (
                  <tr key={link.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{linkedAsset.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{linkedAsset.type || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(linkedAsset.purchaseDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {linkedAsset.purchasePrice.toLocaleString('en-US', { style: 'currency', currency: 'ETB' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {linkedAsset.depreciations?.[0]?.usefulLife || 'N/A'} months
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {depreciationToDate.toLocaleString('en-US', { style: 'currency', currency: 'ETB' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                      <Link href={`/assets/${linkedAsset.id}`}>View</Link>
                    </td>
                  </tr>
                );
              })}
              {(!asset?.linkedTo || asset.linkedTo.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                    No linked assets found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900">Total Linked Assets Value</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">
              {totalValue.toLocaleString('en-US', { style: 'currency', currency: 'ETB' })}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900">Total Depreciation (Linked Items)</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">
              {totalDepreciation.toLocaleString('en-US', { style: 'currency', currency: 'ETB' })}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900">Combined Depreciation</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">
              {((asset?.purchasePrice || 0) - (asset?.currentValue || 0) + totalDepreciation).toLocaleString('en-US', { style: 'currency', currency: 'ETB' })}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab.toLowerCase()) {
      case 'history':
        return renderHistoryTab();
      case 'linking':
        return (
          <div>
            <LinkAssetModal
              open={isLinkingAsset}
              onClose={() => setIsLinkingAsset(false)}
              onSuccess={handleLinkSuccess}
              currentAssetId={params.id}
              availableAssets={availableAssets}
            />
            {renderLinkingTab()}
          </div>
        );
      case 'depreciation':
        return (
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
        );
      default:
        return (
          <div className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900">Tab Under Development</h3>
            <p className="mt-2 text-sm text-gray-500">
              The {activeTab} tab is currently under development and will be available soon.
            </p>
          </div>
        );
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

  const formatDate = (dateString: string | null | undefined) => {
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
        {['details', 'events', 'photos', 'docs', 'depreciation', 'warranty', 'linking', 'maint', 'contracts', 'reserve', 'audit', 'history'].map((tab) => (
          <button
            key={tab}
            className={`py-2 ${
              activeTab.toLowerCase() === tab ? 'border-b-2 border-yellow-500 font-medium' : ''
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  );
} 