'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { LinkAssetModal } from '@/components/LinkAssetModal';
import { AssetLinkingTable } from '@/components/AssetLinkingTable';
import { ManageDepreciationModal, DepreciationSettings } from '@/components/ManageDepreciationModal';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from 'react-hot-toast';
import { CapitalImprovementsTab } from '@/components/CapitalImprovementsTab';
import { DocumentsTab } from '@/components/DocumentsTab';
import { PhotosTab } from '@/components/PhotosTab';
import { ArrowLeft, Download, Settings } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { usePDF } from 'react-to-pdf';
import {
  DepreciationMethod,
  DepreciationResult,
  MonthlyDepreciationResult
} from '@/utils/depreciation';
import type { LinkedAsset } from '@/types';



interface Asset {
  id: string;
  name: string;
  itemDescription?: string | null;
  serialNumber: string;
  oldTagNumber?: string | null;
  newTagNumber?: string | null;
  grnNumber?: string | null;
  grnDate?: string | null;
  unitPrice: number;
  sivNumber?: string | null;
  sivDate?: string | null;
  currentDepartment?: string | null;
  remark?: string | null;
  usefulLifeYears?: number | null;
  residualPercentage?: number | null;
  currentValue: number;
  status: string;
  location?: string | null;
  category?: string | null;
  supplier?: string | null;
  warrantyExpiry?: string | null;
  lastMaintenance?: string | null;
  nextMaintenance?: string | null;
  salvageValue?: number | null;
  depreciationMethod?: string | null;
  depreciationStartDate?: string | null;
  createdAt: string;
  updatedAt: string;
  linkedTo: LinkedAsset[];
  linkedFrom: LinkedAsset[];
  capitalImprovements?: CapitalImprovement[];
  depreciations: Array<{ usefulLife: number }>;
}


interface CapitalImprovement {
  id: string;
  description: string;
  improvementDate: string;
  cost: number;
  usefulLifeMonths: number | null;
  depreciationMethod: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface HistoryRecord {
  changedAt: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  changedBy: string | null;
}

export default function AssetDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  // Define all hooks at the top level
  const { checkPermission } = usePermissions();
  const router = useRouter();
  // Session is used for authorization checks in API calls
  useSession();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  const [isLinkingAsset, setIsLinkingAsset] = useState(false);
  const [isManagingDepreciation, setIsManagingDepreciation] = useState(false);
  // These state variables are used in the renderLinkingTab function
  const [availableAssets, setAvailableAssets] = useState<Asset[]>([]);
  const [depreciationData, setDepreciationData] = useState<Array<{year: number, value: number}>>([]);
  const [depreciationResults, setDepreciationResults] = useState<DepreciationResult[]>([]);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [firstPhoto, setFirstPhoto] = useState<{id: string, filePath: string, description?: string} | null>(null);
  const [isPhotoLoading, setIsPhotoLoading] = useState(true);
  const { toPDF, targetRef } = usePDF({
    filename: `depreciation-report-${asset?.name || 'asset'}.pdf`,
  });

  // Depreciation settings
  const [usefulLife, setUsefulLife] = useState<number>(5);
  const [salvageValue, setSalvageValue] = useState<number>(0);
  const [depreciationMethod, setDepreciationMethod] = useState<DepreciationMethod>('STRAIGHT_LINE');
  const [depreciationRate, setDepreciationRate] = useState<number>(20);
  const [depreciationSettings, setDepreciationSettings] = useState<DepreciationSettings>({
    isDepreciable: true,
    depreciableCost: 0,
    salvageValue: 0,
    usefulLifeMonths: 60,
    depreciationMethod: 'STRAIGHT_LINE',
    dateAcquired: new Date().toISOString().split('T')[0]
  });
  const [monthlyDepreciationResults, setMonthlyDepreciationResults] = useState<MonthlyDepreciationResult[]>([]);
  const [depreciationTableTab, setDepreciationTableTab] = useState<'yearly' | 'monthly'>('yearly');

  // Unwrap params Promise for Next.js App Router
  const resolvedParams = React.use(params);

  // Fetch initial asset data
  useEffect(() => {
    const fetchAsset = async () => {
      setIsLoading(true);
      try {
        console.log("INITIAL FETCH - Fetching asset data for ID:", resolvedParams.id);
        const response = await fetch(`/api/assets/${resolvedParams.id}`);
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
  }, [resolvedParams.id]);

  // Update depreciation settings when asset changes
  useEffect(() => {
    if (asset) {
      // Update depreciation settings based on asset data
      setDepreciationSettings({
        isDepreciable: true,
        depreciableCost: asset.currentValue || 0,
        salvageValue: asset.salvageValue || 0,
        usefulLifeMonths: asset.usefulLifeYears || 60,
        depreciationMethod: asset.depreciationMethod || 'STRAIGHT_LINE',
        dateAcquired: asset.sivDate
          ? new Date(asset.sivDate).toISOString().split('T')[0]
          : (asset.createdAt ? new Date(asset.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])
      });

      // Update other depreciation state variables
      setSalvageValue(asset.salvageValue || 0);
      setUsefulLife(Math.ceil((asset.usefulLifeYears || 60) / 12));
      setDepreciationMethod(asset.depreciationMethod === 'DECLINING_BALANCE' ? 'DECLINING_BALANCE' : 'STRAIGHT_LINE');
    }
  }, [asset]);



  // Add useEffect for history tab
  useEffect(() => {
    // Function to fetch history data
    const fetchHistory = async () => {
      if (activeTab === 'history') {
        setIsHistoryLoading(true);
        try {
          const response = await fetch(`/api/assets/${resolvedParams.id}/history`);
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
  }, [activeTab, resolvedParams.id]);

  // Add useEffect for depreciation tab
  useEffect(() => {
    // Function to fetch depreciation data
    const fetchDepreciationData = async () => {
      if (activeTab === 'depreciation' && asset) {
        try {
          const response = await fetch(`/api/assets/${resolvedParams.id}/depreciation`);
          if (!response.ok) throw new Error('Failed to fetch depreciation data');
          const data = await response.json();

          // Update depreciation results and chart data
          setDepreciationResults(data.depreciationResults);
          setMonthlyDepreciationResults(data.monthlyDepreciationResults || []);
          setDepreciationData(data.chartData);

          // Update depreciation settings
          if (data.depreciationSettings) {
            setSalvageValue(data.depreciationSettings.salvageValue || 0);
            setUsefulLife(data.depreciationSettings.usefulLifeYears || 5);
            setDepreciationMethod(data.depreciationSettings.depreciationMethod === 'STRAIGHT_LINE' ? 'STRAIGHT_LINE' : 'DECLINING_BALANCE');

            setDepreciationSettings({
              isDepreciable: true,
              depreciableCost: data.depreciationSettings.depreciableCost || asset.currentValue || 0,
              salvageValue: data.depreciationSettings.salvageValue || 0,
              usefulLifeMonths: data.depreciationSettings.usefulLifeMonths || 60,
              depreciationMethod: data.depreciationSettings.depreciationMethod || 'STRAIGHT_LINE',
              dateAcquired: data.depreciationSettings.startDate
                ? new Date(data.depreciationSettings.startDate).toISOString().split('T')[0]
                : (asset.createdAt ? new Date(asset.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])
            });
          }
        } catch (error) {
          console.error('Error fetching depreciation data:', error);
          toast.error('Failed to load depreciation data');
        }
      }
    };

    fetchDepreciationData();
  }, [activeTab, resolvedParams.id, asset]);

  // Function to fetch first photo
  const fetchFirstPhoto = async () => {
    if (asset) {
      setIsPhotoLoading(true);
      try {
        const response = await fetch(`/api/assets/${resolvedParams.id}/photos`);
        if (response.ok) {
          const photos = await response.json();
          if (photos.length > 0) {
            // Get the first photo (most recent by default from API)
            const firstPhotoData = photos[photos.length - 1]; // Get the oldest photo (first uploaded)
            setFirstPhoto({
              id: firstPhotoData.id,
              filePath: firstPhotoData.filePath,
              description: firstPhotoData.description
            });
          } else {
            setFirstPhoto(null);
          }
        }
      } catch (error) {
        console.error('Error fetching first photo:', error);
      } finally {
        setIsPhotoLoading(false);
      }
    }
  };

  // Add useEffect for fetching first photo
  useEffect(() => {
    fetchFirstPhoto();
  }, [asset, resolvedParams.id]);

  // Check permissions first
  if (!checkPermission('Asset view (list and detail)')) {
    return (
      <div className="p-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen">
        <h1 className="text-2xl font-semibold">Access Denied</h1>
        <p className="mt-2">You do not have permission to view asset details.</p>
      </div>
    );
  }



  const handleLinkSuccess = () => {
    // Refresh the asset data without reloading the page
    console.log("Link/unlink operation successful, refreshing data...");

    // Refetch the asset data
    const fetchAsset = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/assets/${resolvedParams.id}`);
        if (!response.ok) throw new Error('Failed to fetch asset');
        const data = await response.json();
        console.log("Refreshed asset data:", data);
        setAsset(data);
      } catch (error) {
        console.error('Error fetching asset:', error);
        toast.error('Failed to refresh asset data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAsset();
  };



  const handleSaveDepreciationSettings = async (settings: DepreciationSettings) => {
    if (!asset) return;

    try {
      // Convert months to years for the API
      const usefulLifeYears = Math.ceil(settings.usefulLifeMonths / 12);

      // Call the API with the new settings using PUT method to update the asset
      const response = await fetch(
        `/api/assets/${resolvedParams.id}/depreciation?usefulLife=${usefulLifeYears}&salvageValue=${settings.salvageValue}&method=${settings.depreciationMethod}&depreciationRate=${settings.depreciationMethod === 'DOUBLE_DECLINING' ? 40 : 20}&depreciableCost=${settings.depreciableCost}&dateAcquired=${settings.dateAcquired}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error('Failed to update depreciation settings');

      const data = await response.json();
      setDepreciationResults(data.depreciationResults);
      setMonthlyDepreciationResults(data.monthlyDepreciationResults || []);
      setDepreciationData(data.chartData);

      // Update local state
      setSalvageValue(settings.salvageValue);
      setUsefulLife(usefulLifeYears);
      setDepreciationMethod(settings.depreciationMethod === 'STRAIGHT_LINE' ? 'STRAIGHT_LINE' : 'DECLINING_BALANCE');

      if (settings.depreciationMethod !== 'STRAIGHT_LINE') {
        setDepreciationRate(settings.depreciationMethod === 'DOUBLE_DECLINING' ? 40 : 20);
      }

      // Update the depreciation settings state
      setDepreciationSettings({
        ...settings,
        usefulLifeMonths: settings.usefulLifeMonths,
      });

      // Update the asset state with the new values
      if (asset) {
        setAsset({
          ...asset,
          depreciableCost: settings.depreciableCost,
          salvageValue: settings.salvageValue,
          usefulLifeMonths: settings.usefulLifeMonths,
          depreciationMethod: settings.depreciationMethod,
          depreciationStartDate: settings.dateAcquired
        });
      }

      // Close the modal
      setIsManagingDepreciation(false);

      toast.success('Depreciation settings updated successfully');
    } catch (error) {
      console.error('Error updating depreciation settings:', error);
      toast.error('Failed to update depreciation settings');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this asset?')) {
      return;
    }

    try {
      const response = await fetch(`/api/assets/${resolvedParams.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);

        if (errorData.code === 'P2003') {
          toast.error(errorData.details || 'This asset has related records that need to be deleted first.');
        } else {
          toast.error(errorData.details || 'Failed to delete asset');
        }

        throw new Error(errorData.details || 'Failed to delete asset');
      }

      toast.success('Asset deleted successfully');
      router.push('/assets');
      router.refresh();
    } catch (error) {
      console.error('Error deleting asset:', error);
    }
  };

  const renderHistoryTab = () => {
    if (isHistoryLoading) {
      return (
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
        </div>
      );
    }

    return (
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Asset History</h2>
        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700">
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Field
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Changed from
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Changed to
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Changed by
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {history.map((record, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {new Date(record.changedAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {record.field}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {record.oldValue || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {record.newValue || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {record.changedBy || 'System'}
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
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

  // Function to fetch available assets for linking
  const fetchAvailableAssets = async () => {
    try {
      console.log("Fetching available assets for linking");
      const response = await fetch('/api/assets');
      if (!response.ok) {
        throw new Error('Failed to fetch available assets');
      }

      const allAssets = await response.json();
      console.log("All assets fetched:", allAssets.length);

      // Filter out the current asset and any assets that are already linked
      // or are children of other assets or have children
      const filteredAssets = allAssets.filter((fetchedAsset: Asset) => {
        // Exclude the current asset
        if (fetchedAsset.id === resolvedParams.id) {
          return false;
        }

        // Exclude assets that are already children of other assets
        if (fetchedAsset.linkedFrom && fetchedAsset.linkedFrom.length > 0) {
          return false;
        }

        // Exclude assets that already have children
        if (fetchedAsset.linkedTo && fetchedAsset.linkedTo.length > 0) {
          return false;
        }

        return true;
      });

      console.log("Filtered available assets:", filteredAssets.length);
      setAvailableAssets(filteredAssets);
    } catch (error) {
      console.error("Error fetching available assets:", error);
      toast.error("Failed to load available assets for linking");
    }
  };

  // Handle opening the linking modal
  const handleOpenLinkingModal = () => {
    // Fetch available assets when the modal is opened
    fetchAvailableAssets();
    // Then open the modal
    setIsLinkingAsset(true);
  };

  const renderLinkingTab = () => {
    return (
      <div>
        <LinkAssetModal
          open={isLinkingAsset}
          onClose={() => setIsLinkingAsset(false)}
          onSuccess={handleLinkSuccess}
          currentAssetId={resolvedParams.id}
          availableAssets={availableAssets}
        />
        <AssetLinkingTable
          asset={asset!} // Ensure asset is not null, or add a null check if needed
          onLinkClick={handleOpenLinkingModal}
          onUnlinkSuccess={handleLinkSuccess}
        />
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab.toLowerCase()) {
      case 'history':
        return renderHistoryTab();
      case 'linking':
        return renderLinkingTab();
      case 'capital_improvment':
        return <CapitalImprovementsTab assetId={resolvedParams.id} />;
      case 'docs':
        return (
          <DocumentsTab
            assetId={resolvedParams.id}
            assetName={asset?.name || 'Asset'}
          />
        );
      case 'depreciation':
        if (asset?.category === 'Land') {
          return (
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 text-gray-600 mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Non-Depreciable Asset</h3>
              <p className="mt-2 text-sm text-gray-500">
                This asset is a land asset and is not subject to depreciation. Land assets are considered non-depreciable as they typically appreciate in value over time rather than depreciate.
              </p>
            </div>
          );
        }
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
            <div className="mb-6 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold dark:text-gray-500">Depreciation Settings</h2>
                <button
                  onClick={() => setIsManagingDepreciation(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <Settings size={16} />
                  Manage
                </button>
              </div>
            </div>

            <ManageDepreciationModal
              open={isManagingDepreciation}
              onClose={() => setIsManagingDepreciation(false)}
              onSave={handleSaveDepreciationSettings}
              initialSettings={depreciationSettings}
            />

            {/* Depreciation Details */}
            <div className="mb-6 dark:bg-gray-800">
              <h2 className="text-lg font-semibold mb-2 dark:text-gray-500">Depreciation Details</h2>
              <div className="overflow-x-auto text-sm">
                <table className="w-full border text-left">
                  <thead className="bg-gray-100 dark:bg-gray-800">
                    <tr>
                      <th className="p-2 border">Depreciable Cost</th>
                      <th className="p-2 border">Salvage Value</th>
                      <th className="p-2 border">Asset Life (years)</th>
                      <th className="p-2 border">Depr. Method</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2 border">{formatCurrency(depreciationSettings.depreciableCost || asset?.currentValue || 0)}</td>
                      <td className="p-2 border">{formatCurrency(salvageValue || 0)}</td>
                      <td className="p-2 border">{usefulLife} years</td>
                      <td className="p-2 border">{
  (() => {
    const method = depreciationSettings.depreciationMethod || depreciationMethod;
    // Type guard for depreciationRate
    const rate = (typeof (depreciationSettings as { depreciationRate?: unknown }).depreciationRate === 'number')
      ? (depreciationSettings as { depreciationRate?: number }).depreciationRate!
      : depreciationRate;
    switch (method) {
      case 'STRAIGHT_LINE':
        return 'Straight Line';
      case 'DECLINING_BALANCE':
        return rate === 40 ? 'Double Declining' : 'Declining Balance';
      case 'DOUBLE_DECLINING':
        return 'Double Declining';
      case 'SUM_OF_YEARS_DIGITS':
        return 'Sum of Years Digits';
      case 'UNITS_OF_ACTIVITY':
        return 'Units of Activity';
      default:
        return method;
    }
  })()
}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Depreciation Chart */}
            <div className="mb-6 dark:bg-gray-800">
              <h3 className="text-md font-medium mb-2 dark:text-gray-500">Depreciation yearly stats…</h3>
              <div className="h-48 bg-white rounded-lg border p-2 mb-4 dark:bg-gray-800">
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

            {/* Yearly/Monthly Tabs */}
            <div className="flex gap-2 mb-2">
              <button
                className={`px-4 py-2 rounded-t ${depreciationTableTab === 'yearly' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
                onClick={() => setDepreciationTableTab('yearly')}
              >
                Yearly
              </button>
              <button
                className={`px-4 py-2 rounded-t ${depreciationTableTab === 'monthly' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
                onClick={() => setDepreciationTableTab('monthly')}
              >
                Monthly
              </button>
            </div>
            {depreciationTableTab === 'yearly' ? (
              <div className="overflow-x-auto text-sm mb-6 dark:bg-gray-800">
                <h3 className="text-md font-medium mb-2 dark:text-gray-500">Yearly Depreciation Schedule</h3>
                <table className="w-full border text-left">
                  <thead className="bg-gray-100 dark:bg-gray-800">
                    <tr>
                      <th className="p-2 border font-semibold">Year</th>
                      <th className="p-2 border font-semibold">Depreciation Expense</th>
                      <th className="p-2 border font-semibold">Accumulated Depreciation</th>
                      <th className="p-2 border font-semibold">Book Value</th>
                    </tr>
                  </thead>
                  <tbody className="dark:bg-gray-800">
                    {depreciationResults
                      .filter(result => result.depreciationExpense > 0) // Only show years with actual depreciation
                      .map((result, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800'}>
                          <td className="p-2 border">{result.year}</td>
                          <td className="p-2 border">{formatCurrency(result.depreciationExpense)}</td>
                          <td className="p-2 border">{formatCurrency(result.accumulatedDepreciation)}</td>
                          <td className="p-2 border">{formatCurrency(result.bookValue)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto text-sm mb-6 dark:bg-gray-800">
                <h3 className="text-md font-medium mb-2 dark:text-gray-500">Monthly Depreciation Schedule</h3>
                <table className="w-full border text-left">
                  <thead className="bg-gray-100 dark:bg-gray-800">
                    <tr>
                      <th className="p-2 border font-semibold">Year</th>
                      <th className="p-2 border font-semibold">Month</th>
                      <th className="p-2 border font-semibold">Depreciation Expense</th>
                      <th className="p-2 border font-semibold">Accumulated Depreciation</th>
                      <th className="p-2 border font-semibold">Book Value</th>
                    </tr>
                  </thead>
                  <tbody className="dark:bg-gray-800">
                    {monthlyDepreciationResults
                      .filter(result => result.depreciationExpense > 0) // Only show rows with actual depreciation
                      .map((result, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800'}>
                          <td className="p-2 border">{result.year}</td>
                          <td className="p-2 border">{result.month}</td>
                          <td className="p-2 border">{formatCurrency(result.depreciationExpense)}</td>
                          <td className="p-2 border">{formatCurrency(result.accumulatedDepreciation)}</td>
                          <td className="p-2 border">{formatCurrency(result.bookValue)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      case 'photos':
        return (
          <PhotosTab
            assetId={resolvedParams.id}
            assetName={asset?.name || 'Asset'}
            onPhotosChange={fetchFirstPhoto}
          />
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
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Asset Not Found</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">The requested asset could not be found.</p>
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
        return 'text-gray-600 dark:text-gray-300';
    }
  };

  const isAssetDisposed = (asset: Asset) => asset.status === "DISPOSED";

  return (
    <div className="max-w-6xl mx-auto p-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-md rounded-lg">
      {/* Header Bar */}
      <div className={`${isAssetDisposed(asset) ? 'bg-gray-500' : 'bg-red-500'} text-white p-4 rounded-md flex flex-col md:flex-row md:items-center md:justify-between mb-4`}>
        <div className="flex items-center gap-4 mb-2 md:mb-0">
          <ArrowLeft className="cursor-pointer" onClick={() => router.push('/assets')} />
          <div>
            <h1 className="text-lg font-semibold">{asset.name}</h1>
            <p className="text-sm">Asset Tag ID: {asset.serialNumber} • Site: {asset.location}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isAssetDisposed(asset) && checkPermission('Asset edit') && (
            <button
              onClick={() => router.push(`/assets/${asset.id}/edit`)}
              className="bg-white text-blue-600 px-4 py-2 rounded-md font-medium hover:bg-blue-50"
            >
              Edit
            </button>
          )}
          {!isAssetDisposed(asset) && checkPermission('Asset delete') && (
            <button
              onClick={handleDelete}
              className="bg-white text-red-600 px-4 py-2 rounded-md font-medium hover:bg-red-50"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Asset Info Section */}
      <div className="flex flex-col md:flex-row gap-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg mb-6">
        <div className="w-48 h-48 bg-gray-100 dark:bg-gray-800 border rounded flex items-center justify-center overflow-hidden">
          {isPhotoLoading ? (
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#FF0000]"></div>
          ) : firstPhoto ? (
            <img
              src={firstPhoto.filePath}
              alt={firstPhoto.description || asset.name}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
              onClick={() => setActiveTab('photos')}
              title="Click to view all photos"
              onError={(e) => {
                // If image fails to load, show placeholder
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = '<span class="text-gray-400">Image not available</span>';
                }
              }}
            />
          ) : (
            <div className="text-center">
              <div className="text-4xl text-gray-400 dark:text-gray-500 mb-2">📷</div>
              <span className="text-gray-400 text-sm">No photos</span>
            </div>
          )}
        </div>
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div>
            <p><span className="font-semibold">serialNumber:</span> {asset.serialNumber}</p>
            <p><span className="font-semibold">SIV Date:</span> {formatDate(asset.sivDate || asset.createdAt)}</p>
            <p><span className="font-semibold">Unit Price:</span> {formatCurrency(asset.unitPrice)}</p>
            <p><span className="font-semibold">Supplier:</span> {asset.supplier || 'Not specified'}</p>
            <p><span className="font-semibold">Model:</span> {asset.name}</p>
          </div>
          <div>
            <p><span className="font-semibold">Site:</span> {asset.location || 'Not specified'}</p>
            <p><span className="font-semibold">Location:</span> {asset.location || 'Not specified'}</p>
            <p><span className="font-semibold">Category:</span> {asset.category || 'Not specified'}</p>
            <p><span className="font-semibold">Department:</span> {asset.currentDepartment || 'Not specified'}</p>
            <p><span className="font-semibold">Status:</span> <span className={`${getStatusColor(asset.status)} font-semibold`}>{asset.status.replace('_', ' ')}</span></p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        {['photos', 'docs', 'depreciation', 'linking', 'capital_improvment', 'history'].map((tab) => {
          const isAllowedForDisposed = ['photos', 'docs', 'history'].includes(tab);
          const isDisabled = isAssetDisposed(asset) && !isAllowedForDisposed;
          
          return (
            <button
              key={tab}
              className={`py-1.5 px-2 mx-0.5 text-sm ${
                activeTab.toLowerCase() === tab ? 'border-b-2 border-red-500 font-medium' : ''
              } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => {
                if (!isDisabled) {
                  setActiveTab(tab);
                }
              }}
              disabled={isDisabled}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {isAssetDisposed(asset) && !['photos', 'docs', 'history'].includes(activeTab.toLowerCase()) ? (
        <div className="p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 text-gray-600 mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900">Asset is Disposed</h3>
          <p className="mt-2 text-sm text-gray-500">
            This asset has been disposed and is now in read-only mode. You can view the asset details but cannot make any modifications.
          </p>
        </div>
      ) : (
        renderTabContent()
      )}
    </div>
  );
}