'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { LinkAssetModal } from '@/components/LinkAssetModal';
import { AssetLinkingTable } from '@/components/AssetLinkingTable';
import { ManageDepreciationModal, DepreciationSettings } from '@/components/ManageDepreciationModal';
// import { CapitalImprovementsTab } from '@/components/CapitalImprovementsTab';
import { AssetAuditTab } from '@/components/AssetAuditTab';
import { DocumentsTab } from '@/components/DocumentsTab';
import { MaintenanceTabWrapper } from '@/components/MaintenanceTabWrapper';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from 'react-hot-toast';
import { CapitalImprovementsTab } from '@/components/CapitalImprovementsTab';
import { ArrowLeft, Download, Settings } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { usePDF } from 'react-to-pdf';
import {
  DepreciationMethod,
  DepreciationResult
} from '@/utils/depreciation';
import type { LinkedAsset } from '@/types';



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

interface AssetAudit {
  id: string;
  auditDate: string;
  auditedBy: string;
  status: string;
  condition: string;
  locationVerified: boolean;
  notes: string | null;
  discrepancies: string | null;
  discrepancyResolved: boolean;
  resolvedDate: string | null;
  resolvedBy: string | null;
  resolutionNotes: string | null;
  photoUrls: string | null;
  nextAuditDate: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Asset {
  id: string;
  name: string;
  description: string;
  serialNumber: string;
  purchaseDate: string;
  purchasePrice: number;
  currentValue: number;
  depreciableCost?: number;
  salvageValue?: number;
  usefulLifeMonths?: number;
  depreciationMethod?: string;
  depreciationStartDate?: string;
  status: string;
  location: string;
  department: string;
  category: string;
  type: string;
  supplier: string;
  warrantyExpiry: string | null;
  lastMaintenance: string | null;
  nextMaintenance: string | null;
  lastAuditDate?: string | null;
  nextAuditDate?: string | null;

  createdAt: string;
  updatedAt: string;
  linkedTo: LinkedAsset[];
  linkedFrom: LinkedAsset[];
  capitalImprovements?: CapitalImprovement[];
  audits?: AssetAudit[];
  depreciations: Array<{
    usefulLife: number;
  }>;
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
  const [availableAssets] = useState<Asset[]>([]);
  const [depreciationData, setDepreciationData] = useState<Array<{year: number, value: number}>>([]);
  const [depreciationResults, setDepreciationResults] = useState<DepreciationResult[]>([]);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const { toPDF, targetRef } = usePDF({
    filename: `depreciation-report-${asset?.name || 'asset'}.pdf`,
  });

  // Depreciation settings
  const [usefulLife, setUsefulLife] = useState<number>(5);
  const [salvageValue, setSalvageValue] = useState<number>(0);
  const [depreciationMethod, setDepreciationMethod] = useState<DepreciationMethod>('STRAIGHT_LINE');
  // Depreciation rate is used in the handleSaveDepreciationSettings function
  const [, setDepreciationRate] = useState<number>(20);
  const [depreciationSettings, setDepreciationSettings] = useState<DepreciationSettings>({
    isDepreciable: true,
    depreciableCost: 0,
    salvageValue: 0,
    usefulLifeMonths: 60,
    depreciationMethod: 'STRAIGHT_LINE',
    dateAcquired: new Date().toISOString().split('T')[0]
  });

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
        depreciableCost: asset.depreciableCost || asset.purchasePrice || 0,
        salvageValue: asset.salvageValue || 0,
        usefulLifeMonths: asset.usefulLifeMonths || 60,
        depreciationMethod: asset.depreciationMethod || 'STRAIGHT_LINE',
        dateAcquired: asset.depreciationStartDate
          ? new Date(asset.depreciationStartDate).toISOString().split('T')[0]
          : (asset.purchaseDate ? new Date(asset.purchaseDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])
      });

      // Update other depreciation state variables
      setSalvageValue(asset.salvageValue || 0);
      setUsefulLife(Math.ceil((asset.usefulLifeMonths || 60) / 12));
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
          setDepreciationData(data.chartData);

          // Update depreciation settings
          if (data.depreciationSettings) {
            setSalvageValue(data.depreciationSettings.salvageValue || 0);
            setUsefulLife(data.depreciationSettings.usefulLifeYears || 5);
            setDepreciationMethod(data.depreciationSettings.depreciationMethod === 'STRAIGHT_LINE' ? 'STRAIGHT_LINE' : 'DECLINING_BALANCE');

            setDepreciationSettings({
              isDepreciable: true,
              depreciableCost: data.depreciationSettings.depreciableCost || asset.purchasePrice || 0,
              salvageValue: data.depreciationSettings.salvageValue || 0,
              usefulLifeMonths: data.depreciationSettings.usefulLifeMonths || 60,
              depreciationMethod: data.depreciationSettings.depreciationMethod || 'STRAIGHT_LINE',
              dateAcquired: data.depreciationSettings.startDate
                ? new Date(data.depreciationSettings.startDate).toISOString().split('T')[0]
                : (asset.purchaseDate ? new Date(asset.purchaseDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])
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

  // Check permissions first
  if (!checkPermission('Asset view (list and detail)')) {
    return (
      <div className="p-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 dark:text-gray-100 min-h-screen">
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

      console.log("Saving depreciation settings:", {
        usefulLifeYears,
        salvageValue: settings.salvageValue,
        depreciationMethod: settings.depreciationMethod,
        depreciableCost: settings.depreciableCost,
        dateAcquired: settings.dateAcquired,
        calculateAsGroup: settings.calculateAsGroup,
        linkedAssetsCount: asset.linkedTo?.length || 0
      });

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

      console.log("Received updated depreciation data:", {
        resultsCount: data.depreciationResults.length,
        chartDataCount: data.chartData.length,
        calculateAsGroup: data.depreciationSettings.calculateAsGroup,
        linkedAssetsCount: data.depreciationSettings.linkedAssetsCount
      });

      // Log the first few depreciation results to see the values
      if (data.depreciationResults && data.depreciationResults.length > 0) {
        console.log("First few updated depreciation results:", data.depreciationResults.slice(0, 3));
      }
      setDepreciationResults(data.depreciationResults);
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

  // Function to recalculate asset depreciation
  const calculateAssetDepreciation = async () => {
    if (!asset) return;

    try {
      // Fetch fresh depreciation data from the API
      const response = await fetch(`/api/assets/${resolvedParams.id}/depreciation`);
      if (!response.ok) throw new Error('Failed to fetch depreciation data');

      const data = await response.json();

      console.log("Recalculated depreciation data:", {
        resultsCount: data.depreciationResults?.length || 0,
        chartDataCount: data.chartData?.length || 0,
        firstResult: data.depreciationResults?.[0],
        firstChartPoint: data.chartData?.[0]
      });

      // Update the state with the new data
      setDepreciationResults(data.depreciationResults || []);
      setDepreciationData(data.chartData || []);

      toast.success('Depreciation recalculated successfully');
    } catch (error) {
      console.error('Error recalculating depreciation:', error);
      toast.error('Failed to recalculate depreciation');
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
          onLinkClick={() => setIsLinkingAsset(true)}
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
      case 'audit':
        return <AssetAuditTab
          assetId={resolvedParams.id}
          assetName={asset?.name || ''}
          assetLocation={asset?.location}
          lastAuditDate={asset?.lastAuditDate}
          nextAuditDate={asset?.nextAuditDate}
        />;
      case 'docs':
        return <DocumentsTab
          assetId={resolvedParams.id}
          assetName={asset?.name || ''}
        />;
      case 'maint':
        return <MaintenanceTabWrapper
          assetId={resolvedParams.id}
          assetName={asset?.name || ''}
          lastMaintenance={asset?.lastMaintenance}
          nextMaintenance={asset?.nextMaintenance}
        />;
      case 'depreciation':
        return (
          <div ref={targetRef}>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-semibold">Depreciation</h2>
                {/* Show group calculation status for parent assets */}
                {depreciationSettings.calculateAsGroup && asset?.linkedFrom && asset.linkedFrom.length > 0 && (
                  <div className="text-sm text-green-600 font-medium mt-1">
                    Group calculation enabled ({asset.linkedFrom.length} linked {asset.linkedFrom.length === 1 ? 'asset' : 'assets'})
                  </div>
                )}

                {/* Show message for child assets */}
                {asset?.linkedTo && asset.linkedTo.length > 0 && (
                  <div className="text-sm text-blue-600 font-medium mt-1">
                    This is a child asset linked to {asset.linkedTo.length} parent {asset.linkedTo.length === 1 ? 'asset' : 'assets'}
                  </div>
                )}
              </div>
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
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Depreciation Settings</h2>
                <div className="flex gap-2">
                  {/* Only show group calculation button on parent assets (assets with children linked to them)
                      and not on child assets (assets that are linked to a parent) */}
                  {asset?.linkedFrom && asset.linkedFrom.length > 0 && (
                    <button
                      onClick={async () => {
                        // Toggle the group calculation mode
                        const newSettings = {
                          ...depreciationSettings,
                          calculateAsGroup: !depreciationSettings.calculateAsGroup
                        };

                        console.log("Toggling group calculation mode to:", newSettings.calculateAsGroup);

                        // Update the UI immediately to show the change
                        setDepreciationSettings(newSettings);

                        // Force a refresh of the depreciation data
                        try {
                          // Call the API directly with the new setting
                          const response = await fetch(
                            `/api/assets/${resolvedParams.id}/depreciation?calculateAsGroup=${newSettings.calculateAsGroup}`,
                            { method: 'GET' }
                          );

                          if (!response.ok) throw new Error('Failed to fetch depreciation data');

                          const data = await response.json();
                          console.log("Received fresh depreciation data after toggle:", {
                            resultsCount: data.depreciationResults.length,
                            calculateAsGroup: data.depreciationSettings.calculateAsGroup,
                            linkedAssetsCount: data.depreciationSettings.linkedAssetsCount,
                            firstResult: data.depreciationResults[0]
                          });

                          // Update the state with the new data
                          setDepreciationResults(data.depreciationResults);
                          setDepreciationData(data.chartData);

                          // Also save the settings to persist the change
                          handleSaveDepreciationSettings(newSettings);

                          toast.success(`Group calculation mode ${newSettings.calculateAsGroup ? 'enabled' : 'disabled'}`);
                        } catch (error) {
                          console.error('Error refreshing depreciation data:', error);
                          toast.error('Failed to update depreciation data');
                        }
                      }}
                      className={`px-4 py-2 text-white rounded-md transition-colors flex items-center gap-2 ${
                        depreciationSettings.calculateAsGroup
                          ? 'bg-yellow-600 hover:bg-yellow-700'
                          : 'bg-gray-600 hover:bg-gray-700'
                      }`}
                    >
                      {depreciationSettings.calculateAsGroup
                        ? 'Group Calculation: ON'
                        : 'Group Calculation: OFF'}
                    </button>
                  )}

                  {/* Show a message if this is a child asset linked to a parent */}
                  {asset?.linkedTo && asset.linkedTo.length > 0 && (
                    <div className="text-sm text-blue-600 font-medium">
                      This is a child asset. Group calculation is managed by the parent asset.
                    </div>
                  )}
                  <button
                    onClick={calculateAssetDepreciation}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    Recalculate
                  </button>
                  <button
                    onClick={() => setIsManagingDepreciation(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    Manage Settings
                  </button>
                </div>
              </div>
            </div>

            <ManageDepreciationModal
              open={isManagingDepreciation}
              onClose={() => setIsManagingDepreciation(false)}
              onSave={handleSaveDepreciationSettings}
              initialSettings={depreciationSettings}
              assetId={resolvedParams.id}
            />

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
                      <th className="p-2 border">Group Calculation</th>
                      <th className="p-2 border">Capital Improvements</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2 border">{formatDate(asset?.purchaseDate)}</td>
                      <td className="p-2 border">{formatCurrency(depreciationSettings.depreciableCost || asset?.depreciableCost || asset?.purchasePrice || 0)}</td>
                      <td className="p-2 border">{formatCurrency(salvageValue || 0)}</td>
                      <td className="p-2 border">{usefulLife * 12} months</td>
                      <td className="p-2 border">{depreciationMethod === 'STRAIGHT_LINE' ? 'Straight Line' : 'Declining Balance'}</td>
                      <td className="p-2 border">
                        {asset?.linkedTo && asset.linkedTo.length > 0 ? (
                          <div>
                            <span className="text-blue-600 font-medium">Child Asset</span>
                            <div className="text-xs mt-1">
                              Group calculation managed by parent
                            </div>
                          </div>
                        ) : asset?.linkedFrom && asset.linkedFrom.length > 0 ? (
                          <div>
                            {depreciationSettings.calculateAsGroup ? (
                              <span className="text-green-600 font-medium">Enabled</span>
                            ) : (
                              <span className="text-gray-500">Disabled</span>
                            )}
                            <div className="text-xs mt-1">
                              {asset.linkedFrom.length} linked {asset.linkedFrom.length === 1 ? 'asset' : 'assets'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-500">N/A</span>
                        )}
                      </td>
                      <td className="p-2 border">
                        {asset?.capitalImprovements && asset.capitalImprovements.length > 0 ? (
                          <div>
                            <span className="text-purple-600 font-medium">
                              {asset.capitalImprovements.length} {asset.capitalImprovements.length === 1 ? 'Improvement' : 'Improvements'}
                            </span>
                            <div className="text-xs mt-1">
                              Total Value: {formatCurrency(
                                asset.capitalImprovements.reduce((sum, imp) => sum + imp.cost, 0)
                              )}
                            </div>
                            <div className="text-xs text-blue-600 cursor-pointer" onClick={() => setActiveTab('capital_improvment')}>
                              View Details →
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span className="text-gray-500">None</span>
                            <div className="text-xs text-blue-600 cursor-pointer mt-1" onClick={() => setActiveTab('capital_improvment')}>
                              Add Improvement →
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Depreciation Chart */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-md font-medium">Depreciation yearly stats…</h3>
                {depreciationSettings.calculateAsGroup && asset?.linkedFrom && asset.linkedFrom.length > 0 && (
                  <div className="text-sm text-green-600 font-medium">
                    Group calculation enabled - showing combined values
                  </div>
                )}
                {asset?.linkedTo && asset.linkedTo.length > 0 && (
                  <div className="text-sm text-blue-600 font-medium">
                    Child asset - group calculation managed by parent
                  </div>
                )}
              </div>
              <div className={`h-48 bg-white rounded-lg border p-2 mb-4 ${depreciationSettings.calculateAsGroup ? 'border-green-300' : ''}`}>
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
                      formatter={(value) => [
                        `$${Number(value).toLocaleString()}`,
                        depreciationSettings.calculateAsGroup ? 'Group Value' : 'Value'
                      ]}
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
                      stroke={depreciationSettings.calculateAsGroup ? "#10b981" : "#3b82f6"}
                      strokeWidth={2}
                      dot={{ fill: depreciationSettings.calculateAsGroup ? "#10b981" : "#3b82f6", r: 4 }}
                      activeDot={{ r: 6, fill: depreciationSettings.calculateAsGroup ? "#059669" : "#2563eb" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Yearly Depreciation Table */}
            <div className="overflow-x-auto text-sm mb-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-md font-medium">Yearly Depreciation Schedule</h3>
                {depreciationSettings.calculateAsGroup && asset?.linkedFrom && asset.linkedFrom.length > 0 && (
                  <div className="text-sm text-green-600 font-medium">
                    Group calculation enabled - showing combined depreciation
                  </div>
                )}
                {asset?.linkedTo && asset.linkedTo.length > 0 && (
                  <div className="text-sm text-blue-600 font-medium">
                    Child asset - group calculation managed by parent
                  </div>
                )}
              </div>
              <table className={`w-full border text-left ${depreciationSettings.calculateAsGroup ? 'border-green-300' : ''}`}>
                <thead className={depreciationSettings.calculateAsGroup ? "bg-green-50" : "bg-gray-100"}>
                  <tr>
                    <th className="p-2 border font-semibold">Year</th>
                    <th className="p-2 border font-semibold">Depreciation Expense</th>
                    <th className="p-2 border font-semibold">Accumulated Depreciation</th>
                    <th className="p-2 border font-semibold">Book Value</th>
                  </tr>
                </thead>
                <tbody>
                  {depreciationResults.map((result, index) => (
                    <tr
                      key={index}
                      className={`${index % 2 === 0 ? 'bg-white' : depreciationSettings.calculateAsGroup ? 'bg-green-50/30' : 'bg-gray-50'}
                                  ${depreciationSettings.calculateAsGroup ? 'hover:bg-green-50' : 'hover:bg-gray-100'}`}
                    >
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

  return (
    <div className="max-w-6xl mx-auto p-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-md rounded-lg">
      {/* Header Bar */}
      <div className="bg-red-500 text-white p-4 rounded-md flex flex-col md:flex-row md:items-center md:justify-between mb-4">
        <div className="flex items-center gap-4 mb-2 md:mb-0">
          <ArrowLeft className="cursor-pointer" onClick={() => router.back()} />
          <div>
            <h1 className="text-lg font-semibold">{asset.name}</h1>
            <p className="text-sm">Asset Tag ID: {asset.serialNumber} • Site: {asset.location}</p>
          </div>
        </div>
        {checkPermission('Asset edit') && (
          <button
            onClick={() => router.push(`/assets/${asset.id}/edit`)}
            className="bg-white text-blue-600 px-4 py-2 rounded-md font-medium hover:bg-blue-50"
          >
            Edit
          </button>
        )}
        {checkPermission('Asset delete') && (
          <button
            onClick={handleDelete}
            className="bg-white text-red-600 px-4 py-2 rounded-md font-medium hover:bg-red-50"
          >
            Delete
          </button>
        )}
      </div>

      {/* Asset Info Section */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="w-48 h-48 bg-gray-100 dark:bg-gray-800 border rounded flex items-center justify-center">
          <span className="text-gray-400">No image</span>
        </div>
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div>
            <p><span className="font-semibold">Asset Tag ID:</span> {asset.serialNumber}</p>
            <p><span className="font-semibold">Purchase Date:</span> {formatDate(asset.purchaseDate)}</p>
            <p><span className="font-semibold">Purchase Price:</span> {formatCurrency(asset.purchasePrice)}</p>
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
        {['details', 'events', 'photos', 'docs', 'depreciation', 'warranty', 'linking', 'maint', 'contracts', 'capital_improvment', 'audit', 'history'].map((tab) => (
          <button
            key={tab}
            className={`py-2 ${
              activeTab.toLowerCase() === tab.toLowerCase() ? 'border-b-2 border-yellow-500 font-medium' : ''
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'capital_improvment' ? 'Capital Improvement' :
             tab === 'maint' ? 'Maintenance' :
             tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  );
}