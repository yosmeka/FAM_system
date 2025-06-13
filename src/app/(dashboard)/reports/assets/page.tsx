'use client';

import { useState, useEffect, useRef } from 'react';
import { RoleBasedTable } from '@/components/ui/RoleBasedTable';
import { RoleBasedChart } from '@/components/ui/RoleBasedChart';
import { RoleBasedStats } from '@/components/ui/RoleBasedStats';
import { AdvancedFilters, FilterValues, FilterOptions } from '@/components/reports/AdvancedFilters';
import { TableExportDropdown } from '@/components/reports/TableExportDropdown';
import { usePDF } from 'react-to-pdf';
import { Download, Settings, ChevronDown } from 'lucide-react';
import { BackButton } from '@/components/ui/BackButton';
import { toast } from 'react-hot-toast';
import type {
  AssetStatusData,
  AssetValueData,
  AssetCategoryData
} from '@/types/reports';

import { useSession } from 'next-auth/react';

export default function AssetReportsPage() {
  const { data: session, status } = useSession();
  const { toPDF, targetRef } = usePDF({
    filename: `asset-report-${new Date().toISOString().split('T')[0]}.pdf`,
  });
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [activeTab, setActiveTab] = useState('assetDetails');
  const [linkedAssets, setLinkedAssets] = useState<any[]>([]);
  const [loadingLinkedAssets, setLoadingLinkedAssets] = useState(false);
  if (status === 'loading') return null;
  if (!session || !session.user) return null;
  if (session.user.role === 'ADMIN') {
    return (
      <div className="container mx-auto p-6 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <h1 className="text-2xl font-semibold text-center text-red-600 dark:text-red-400">Access Denied</h1>
        <p className="text-center text-gray-700 dark:text-gray-300">You do not have permission to view asset reports.</p>
      </div>
    );
  }
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assetStats, setAssetStats] = useState<any>(null);
  const [assetsByCategory, setAssetsByCategory] = useState<AssetCategoryData[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<AssetStatusData[]>([]);
  const [detailedAssets, setDetailedAssets] = useState<any[]>([]);
  // Removed old filter states - now using currentFilters only
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    categories: [],
    departments: [],
    locations: [],
    depreciationMethods: []
  });
  const [currentFilters, setCurrentFilters] = useState<FilterValues>({
    startDate: '',
    endDate: '',
    category: 'all',
    department: 'all',
    location: 'all',
    status: 'all',
    minValue: '',
    maxValue: '',
    depreciationMethod: 'all'
  });



  useEffect(() => {
    fetchAssetReports();
  }, []);

  useEffect(() => {
    if (activeTab === 'linkedAssets') {
      fetchLinkedAssets();
    }
  }, [activeTab]);

  const buildQueryString = (filters: FilterValues) => {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all' && value !== '') {
        params.append(key, value);
      }
    });

    return params.toString();
  };

  const fetchAssetReports = async (filters?: FilterValues, isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const queryString = filters ? buildQueryString(filters) : '';
      const url = `/api/reports/assets${queryString ? `?${queryString}` : ''}`;

      console.log('🔍 Debug: Full URL:', url);

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch asset reports');
      const data = await response.json();

      console.log('🔍 Debug: Categories returned:', data.byCategory?.length);
      console.log('🔍 Debug: Depreciation data points:', data.depreciation?.length);

      setAssetStats(data.stats);
      setAssetsByCategory(data.byCategory);
      setStatusDistribution(data.statusDistribution);
      setDetailedAssets(data.assets || []);
      setLinkedAssets(data.linkedAssets || []);

      if (data.filterOptions) {
        setFilterOptions(data.filterOptions);
        console.log('🔍 Debug: Filter options updated:', data.filterOptions);
      }

      if (isRefresh) {
        toast.success('Report data refreshed successfully!');
      }
    } catch (error) {
      console.error('❌ Error fetching asset reports:', error);
      toast.error('Failed to fetch asset reports');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchLinkedAssets = async () => {
    try {
      setLoadingLinkedAssets(true);
      console.log('Fetching linked assets...');
      const response = await fetch('/api/test/linked-assets', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Linked assets response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch linked assets');
      }

      if (!data.linkedAssets || data.linkedAssets.length === 0) {
        console.log('No linked assets found in response');
      } else {
        console.log(`Found ${data.linkedAssets.length} linked assets`);
      }

      setLinkedAssets(data.linkedAssets || []);
    } catch (error) {
      console.error('Error fetching linked assets:', error);
      toast.error('Failed to fetch linked assets');
    } finally {
      setLoadingLinkedAssets(false);
    }
  };

  const handleFiltersChange = (filters: FilterValues) => {
    setCurrentFilters(filters);
    fetchAssetReports(filters);
  };

  const handleRefresh = () => {
    fetchAssetReports(currentFilters);
  };

  // Helper function to check if any filters are active
  const hasActiveFilters = Object.values(currentFilters).some(value =>
    value !== '' && value !== 'all'
  );

  // Helper function to get current filter display text
  const getFilterDisplayText = () => {
    const activeFilters = [];

    if (currentFilters.category && currentFilters.category !== 'all') {
      activeFilters.push(`Category: ${currentFilters.category}`);
    }
    if (currentFilters.status && currentFilters.status !== 'all') {
      activeFilters.push(`Status: ${currentFilters.status}`);
    }
    if (currentFilters.department && currentFilters.department !== 'all') {
      activeFilters.push(`Department: ${currentFilters.department}`);
    }
    if (currentFilters.location && currentFilters.location !== 'all') {
      activeFilters.push(`Location: ${currentFilters.location}`);
    }
    if (currentFilters.startDate && currentFilters.endDate) {
      activeFilters.push(`Date: ${currentFilters.startDate} to ${currentFilters.endDate}`);
    }
    if (currentFilters.minValue || currentFilters.maxValue) {
      const min = currentFilters.minValue || '0';
      const max = currentFilters.maxValue || '∞';
      activeFilters.push(`Value: $${min} - $${max}`);
    }

    return activeFilters.length > 0 ? ` (${activeFilters.join(', ')})` : '';
  };

  const exportToPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(16);
      doc.text('Asset Report', 14, 15);
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

      // Add summary statistics
      doc.setFontSize(12);
      doc.text('Summary Statistics', 14, 35);
      
      const statsData: string[][] = [
        ['Total Assets', (assetStats?.totalAssets || 0).toString()],
        ['Active Assets', (assetStats?.activeAssets || 0).toString()],
        ['Transferred Assets', (assetStats?.transferredAssets || 0).toString()],
        ['Disposed Assets', (assetStats?.disposedAssets || 0).toString()]
      ];

      autoTable(doc, {
        startY: 40,
        head: [['Metric', 'Value']],
        body: statsData,
        theme: 'grid',
        styles: {
          fontSize: 10,
          cellPadding: 5,
        },
        headStyles: {
          fillColor: [255, 0, 0],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
      });

      // Add category distribution
      doc.addPage();
      doc.setFontSize(12);
      doc.text('Category Distribution', 14, 20);

      const categoryData: string[][] = assetsByCategory.map(item => [
        item.category || '',
        item.status || '',
        String(item.count || 0),
        String(Number(item.value || 0).toFixed(2))
      ]);

      autoTable(doc, {
        startY: 25,
        head: [['Category', 'Status', 'Count', 'Total Value']],
        body: categoryData,
        theme: 'grid',
        styles: {
          fontSize: 10,
          cellPadding: 5,
        },
        headStyles: {
          fillColor: [255, 0, 0],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
      });

      // Add detailed assets table
      doc.addPage();
      doc.setFontSize(12);
      doc.text('Detailed Asset List', 14, 20);

      const tableHeaders: string[] = ['Asset Name', 'Serial Number', 'Category', 'Status', 'Location', 'Purchase Date', 'Purchase Price', 'Warranty Expiry'];
      const tableRows: string[][] = detailedAssets.map(asset => [
        asset.name || '',
        asset.serialNumber || '',
        asset.category || '',
        asset.status || '',
        asset.location || 'Not specified',
        new Date(asset.purchaseDate).toLocaleDateString(),
        `$${Number(asset.purchasePrice).toFixed(2)}`,
        asset.warrantyExpiry ? new Date(asset.warrantyExpiry).toLocaleDateString() : 'Not specified'
      ]);

      autoTable(doc, {
        startY: 25,
        head: [tableHeaders],
        body: tableRows,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [255, 0, 0],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
      });

      // Add linked assets table
      doc.addPage();
      doc.setFontSize(12);
      doc.text('Linked Assets', 14, 20);

      const linkedAssetsHeaders: string[] = ['Parent Asset', 'Parent Serial', 'Child Asset', 'Child Serial', 'Linked Date'];
      const linkedAssetsRows: string[][] = linkedAssets.map(asset => [
        asset.fromAsset.name || '',
        asset.fromAsset.serialNumber || '',
        asset.toAsset.name || '',
        asset.toAsset.serialNumber || '',
        new Date(asset.createdAt).toLocaleDateString()
      ]);

      autoTable(doc, {
        startY: 25,
        head: [linkedAssetsHeaders],
        body: linkedAssetsRows,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [255, 0, 0],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
      });

      doc.save(`asset-report-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast.error('Failed to export PDF');
    }
  };

  const exportToExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      
      // Create workbook
      const workbook = XLSX.utils.book_new();

      // Summary Statistics Sheet
      const statsData: (string | number)[][] = [
        ['Summary Statistics', ''],
        ['Metric', 'Value'],
        ['Total Assets', assetStats?.totalAssets || 0],
        ['Active Assets', assetStats?.activeAssets || 0],
        ['Transferred Assets', assetStats?.transferredAssets || 0],
        ['Disposed Assets', assetStats?.disposedAssets || 0]
      ];
      const statsSheet = XLSX.utils.aoa_to_sheet(statsData);
      XLSX.utils.book_append_sheet(workbook, statsSheet, 'Summary');

      // Category Distribution Sheet
      const categoryData: (string | number)[][] = [
        ['Category Distribution', '', '', ''],
        ['Category', 'Status', 'Count', 'Total Value'],
        ...assetsByCategory.map(item => [
          item.category || '',
          item.status || '',
          item.count || 0,
          Number(item.value || 0).toFixed(2)
        ])
      ];
      const categorySheet = XLSX.utils.aoa_to_sheet(categoryData);
      XLSX.utils.book_append_sheet(workbook, categorySheet, 'Categories');

      // Detailed Assets Sheet
      const assetsData: (string | number)[][] = [
        ['Detailed Asset List', '', '', '', '', '', '', ''],
        ['Asset Name', 'Serial Number', 'Category', 'Status', 'Location', 'Purchase Date', 'Purchase Price', 'Warranty Expiry'],
        ...detailedAssets.map(asset => [
          asset.name || '',
          asset.serialNumber || '',
          asset.category || '',
          asset.status || '',
          asset.location || 'Not specified',
          new Date(asset.purchaseDate).toLocaleDateString(),
          `$${Number(asset.purchasePrice).toFixed(2)}`,
          asset.warrantyExpiry ? new Date(asset.warrantyExpiry).toLocaleDateString() : 'Not specified'
        ])
      ];
      const assetsSheet = XLSX.utils.aoa_to_sheet(assetsData);
      XLSX.utils.book_append_sheet(workbook, assetsSheet, 'Assets');

      // Linked Assets Sheet
      const linkedAssetsData: (string | number)[][] = [
        ['Linked Assets', '', '', '', ''],
        ['Parent Asset', 'Parent Serial', 'Child Asset', 'Child Serial', 'Linked Date'],
        ...linkedAssets.map(asset => [
          asset.fromAsset.name || '',
          asset.fromAsset.serialNumber || '',
          asset.toAsset.name || '',
          asset.toAsset.serialNumber || '',
          new Date(asset.createdAt).toLocaleDateString()
        ])
      ];
      const linkedAssetsSheet = XLSX.utils.aoa_to_sheet(linkedAssetsData);
      XLSX.utils.book_append_sheet(workbook, linkedAssetsSheet, 'Linked Assets');

      XLSX.writeFile(workbook, `asset-report-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Failed to export Excel file');
    }
  };

  const exportToCSV = () => {
    try {
      // Export summary statistics
      const statsHeaders = ['Metric', 'Value'];
      const statsRows = [
        ['Total Assets', assetStats?.totalAssets || 0],
        ['Active Assets', assetStats?.activeAssets || 0],
        ['Transferred Assets', assetStats?.transferredAssets || 0],
        ['Disposed Assets', assetStats?.disposedAssets || 0]
      ];
      const statsContent = [statsHeaders, ...statsRows].map(row => row.join(',')).join('\n');
      const statsBlob = new Blob([statsContent], { type: 'text/csv;charset=utf-8;' });
      const statsLink = document.createElement('a');
      statsLink.href = URL.createObjectURL(statsBlob);
      statsLink.download = `asset-report-summary-${new Date().toISOString().split('T')[0]}.csv`;
      statsLink.click();

      // Export category distribution
      const categoryHeaders = ['Category', 'Status', 'Count', 'Total Value'];
      const categoryRows = assetsByCategory.map(item => [
        item.category || '',
        item.status || '',
        item.count || 0,
        Number(item.value || 0).toFixed(2)
      ]);
      const categoryContent = [categoryHeaders, ...categoryRows].map(row => row.join(',')).join('\n');
      const categoryBlob = new Blob([categoryContent], { type: 'text/csv;charset=utf-8;' });
      const categoryLink = document.createElement('a');
      categoryLink.href = URL.createObjectURL(categoryBlob);
      categoryLink.download = `asset-report-categories-${new Date().toISOString().split('T')[0]}.csv`;
      categoryLink.click();

      // Export detailed assets
      const assetHeaders = ['Asset Name', 'Serial Number', 'Category', 'Status', 'Location', 'Purchase Date', 'Purchase Price', 'Warranty Expiry'];
      const assetRows = detailedAssets.map(asset => [
        asset.name || '',
        asset.serialNumber || '',
        asset.category || '',
        asset.status || '',
        asset.location || 'Not specified',
        new Date(asset.purchaseDate).toLocaleDateString(),
        `$${Number(asset.purchasePrice).toFixed(2)}`,
        asset.warrantyExpiry ? new Date(asset.warrantyExpiry).toLocaleDateString() : 'Not specified'
      ]);
      const assetContent = [assetHeaders, ...assetRows].map(row => row.join(',')).join('\n');
      const assetBlob = new Blob([assetContent], { type: 'text/csv;charset=utf-8;' });
      const assetLink = document.createElement('a');
      assetLink.href = URL.createObjectURL(assetBlob);
      assetLink.download = `asset-report-detailed-${new Date().toISOString().split('T')[0]}.csv`;
      assetLink.click();

      // Export linked assets
      const linkedAssetsHeaders = ['Parent Asset', 'Parent Serial', 'Child Asset', 'Child Serial', 'Linked Date'];
      const linkedAssetsRows = linkedAssets.map(asset => [
        asset.fromAsset.name || '',
        asset.fromAsset.serialNumber || '',
        asset.toAsset.name || '',
        asset.toAsset.serialNumber || '',
        new Date(asset.createdAt).toLocaleDateString()
      ]);
      const linkedAssetsContent = [linkedAssetsHeaders, ...linkedAssetsRows].map(row => row.join(',')).join('\n');
      const linkedAssetsBlob = new Blob([linkedAssetsContent], { type: 'text/csv;charset=utf-8;' });
      const linkedAssetsLink = document.createElement('a');
      linkedAssetsLink.href = URL.createObjectURL(linkedAssetsBlob);
      linkedAssetsLink.download = `asset-report-linked-${new Date().toISOString().split('T')[0]}.csv`;
      linkedAssetsLink.click();

      toast.success('CSV reports exported successfully!');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export CSV files');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px] bg-white dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500 dark:border-red-400"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <BackButton href="/reports" className='text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300' />
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Advanced Asset Reports</h1>

        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchAssetReports(currentFilters, true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              <Download size={16} />
              Export
              <ChevronDown size={16} />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 dark:bg-gray-800">
                <div className="py-1">
                  <button
                    onClick={() => {
                      exportToPDF();
                      setShowExportMenu(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Export as PDF
                  </button>
                  <button
                    onClick={() => {
                      exportToExcel();
                      setShowExportMenu(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Export as Excel
                  </button>
                  <button
                    onClick={() => {
                      exportToCSV();
                      setShowExportMenu(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Export as CSV
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      <AdvancedFilters
        filterOptions={filterOptions}
        onFiltersChange={handleFiltersChange}
        onRefresh={handleRefresh}
        isLoading={loading || refreshing}
      />

      {/* Filter Results Summary */}
      {hasActiveFilters && (
        <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-2 border-red-600 dark:border-red-500 rounded-lg shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">
                🔍 Filtered Results: {assetStats?.totalAssets || 0} Assets Found
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300">
                Showing assets that match <strong>all</strong> selected filter criteria (AND logic)
              </p>
            </div>
            <div className="text-right bg-white dark:bg-black p-3 rounded-lg border border-red-300">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {assetStats?.totalAssets || 0}
              </div>
              <div className="text-xs text-red-500 dark:text-red-400">
                filtered assets
              </div>
            </div>
          </div>
          {(assetStats?.totalAssets || 0) === 0 && (
            <div className="mt-3 p-3 bg-white dark:bg-black border-2 border-red-600 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">⚠️</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    No assets match all selected criteria
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-300">
                    Try removing some filters or adjusting the criteria to see more results
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Enhanced Summary Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6 mb-8">
        <RoleBasedStats
          name="Total Assets"
          value={assetStats?.totalAssets || 0}
          trend={assetStats?.assetGrowth || 0}
          trendLabel="vs last year"
          variant="default"
          className="bg-white dark:bg-gray-800"
        />
        <RoleBasedStats
          name="Current Value"
          value={new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
          }).format(assetStats?.totalValue || 0)}
          trend={Number(((assetStats?.valueGrowth || 0) / (assetStats?.totalValue || 1) * 100).toFixed(1))}
          trendLabel="vs last year"
          variant="success"
          className="bg-white dark:bg-gray-800"
        />
        <RoleBasedStats
          name="Purchase Value"
          value={new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
          }).format(assetStats?.totalPurchaseValue || 0)}
          variant="default"
          className="bg-white dark:bg-gray-800"
        />
        <RoleBasedStats
          name="Total Depreciation"
          value={new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
          }).format(assetStats?.totalDepreciation || 0)}
          variant="warning"
          className="bg-white dark:bg-gray-800"
        />
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('assetDetails')}
              className={`${
                activeTab === 'assetDetails'
                  ? 'border-red-500 text-red-600 dark:text-red-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Asset Details
            </button>
            <button
              onClick={() => setActiveTab('linkedAssets')}
              className={`${
                activeTab === 'linkedAssets'
                  ? 'border-red-500 text-red-600 dark:text-red-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Linked Assets
            </button>
          </nav>
        </div>
      </div>

      {/* Asset Details Tab Content */}
      {activeTab === 'assetDetails' && (
        <>
          {/* Asset Distribution Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Assets by Category Chart */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Assets by Category{getFilterDisplayText()}
                </h2>
              </div>
              {assetsByCategory.length > 0 ? (
                <RoleBasedChart
                  type="pie"
                  data={assetsByCategory}
                  options={{
                    labels: assetsByCategory.map((item) => item.category),
                    values: assetsByCategory.map((item) => item.count),
                    customColors: ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#EC4899']
                  }}
                />
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400">No data available for current filters</div>
              )}
            </div>

            {/* Status Distribution */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Asset Status Distribution</h2>
              </div>
              {statusDistribution.length > 0 ? (
                <RoleBasedChart
                  type="pie"
                  data={statusDistribution}
                  options={{
                    labels: statusDistribution.map((item) => 
                      item.status === 'UNDER_MAINTENANCE' ? 'Under Maintenance' : 
                      item.status.charAt(0) + item.status.slice(1).toLowerCase()
                    ),
                    values: statusDistribution.map((item) => item.count),
                    customColors: ['#22C55E', '#F97316', '#A855F7', '#06B6D4', '#EAB308', '#F43F5E', '#84CC16']
                  }}
                />
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400">No data available</div>
              )}
            </div>
          </div>

          {/* Asset Value Table */}
          <div className="bg-white rounded-lg shadow dark:bg-gray-900">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-black dark:text-white">
                  Asset Value Details by Category{getFilterDisplayText()}
                </h2>
                <TableExportDropdown
                  data={assetsByCategory}
                  columns={[
                    { header: 'Category', key: 'category' },
                    { header: 'Status', key: 'status' },
                    { header: 'Total Assets', key: 'count' },
                    { header: 'Total Value', key: 'value' },
                    { header: 'Average Value', key: 'averageValue' }
                  ]}
                  title="Asset Value Details by Category"
                  type="summary"
                  filterSummary={getFilterDisplayText()}
                />
              </div>
              {assetsByCategory.length > 0 ? (
                <RoleBasedTable
                  data={assetsByCategory}
                  columns={[
                    {
                      header: 'Category',
                      key: 'category',
                      render: (_, item) => item.category,
                    },
                    {
                      header: 'Status',
                      key: 'status',
                      render: (_, item) => item.status,
                    },
                    {
                      header: 'Total Assets',
                      key: 'count',
                      render: (_, item) => item.count,
                    },
                    {
                      header: 'Total Value',
                      key: 'value',
                      render: (_, item) => `$${Number(item.value).toFixed(2)}`,
                    },
                    {
                      header: 'Average Value',
                      key: 'value',
                      render: (_, item) => `$${(Number(item.value) / Number(item.count)).toFixed(2)}`,
                    },
                  ]}
                  className="bg-white dark:bg-gray-800"
                />
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400">No data available for current filters</div>
              )}
            </div>
          </div>

          {/* Detailed Asset List Table */}
          <div className="bg-white rounded-lg shadow dark:bg-gray-900 mb-8">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-black dark:text-white">
                  Detailed Asset List{getFilterDisplayText()}
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {detailedAssets.length} assets found
                  </span>
                  <TableExportDropdown
                    data={detailedAssets}
                    columns={[
                      { header: 'Asset Name', key: 'name' },
                      { header: 'Serial Number', key: 'serialNumber' },
                      { header: 'Category', key: 'category' },
                      { header: 'Status', key: 'status' },
                      { header: 'Location', key: 'location' },
                      { header: 'Purchase Date', key: 'purchaseDate' },
                      { header: 'Purchase Price', key: 'purchasePrice' },
                      { header: 'Warranty Expiry', key: 'warrantyExpiry' }
                    ]}
                    title="Detailed Asset List"
                    type="detailed"
                    filterSummary={getFilterDisplayText()}
                  />
                </div>
              </div>
              {detailedAssets.length > 0 ? (
                <div className="overflow-x-auto">
                  <RoleBasedTable
                    data={detailedAssets}
                    columns={[
                      {
                        header: 'Asset Name',
                        key: 'name',
                        render: (_, item) => (
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">{item.name}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{item.serialNumber}</div>
                          </div>
                        ),
                      },
                      {
                        header: 'Category',
                        key: 'category',
                        render: (_, item) => (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                            {item.category}
                          </span>
                        ),
                      },
                      {
                        header: 'Status',
                        key: 'status',
                        render: (_, item) => (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.status === 'ACTIVE'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : item.status === 'TRANSFERRED'
                              ? 'bg-black text-white dark:bg-gray-800 dark:text-white'
                              : item.status === 'DISPOSED'
                              ? 'bg-red-600 text-white dark:bg-red-700 dark:text-white'
                              : 'bg-gray-100 text-black dark:bg-gray-700 dark:text-white'
                          }`}>
                            {item.status}
                          </span>
                        ),
                      },
                      {
                        header: 'Location',
                        key: 'location',
                        render: (_, item) => item.location || 'Not specified',
                      },
                      {
                        header: 'Purchase Date',
                        key: 'purchaseDate',
                        render: (_, item) => new Date(item.purchaseDate).toLocaleDateString(),
                      },
                      {
                        header: 'Purchase Price',
                        key: 'purchasePrice',
                        render: (_, item) => `$${Number(item.purchasePrice).toFixed(2)}`,
                      },
                      {
                        header: 'Warranty Expiry',
                        key: 'warrantyExpiry',
                        render: (_, item) => item.warrantyExpiry ? new Date(item.warrantyExpiry).toLocaleDateString() : 'Not specified',
                      }
                    ]}
                    className="bg-white dark:bg-gray-800"
                  />
                </div>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No assets found for current filters
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Linked Assets Tab Content */}
      {activeTab === 'linkedAssets' && (
        <div className="bg-white rounded-lg shadow dark:bg-gray-900 mb-8">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-black dark:text-white">
                Linked Assets Report{getFilterDisplayText()}
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {linkedAssets.length} linked assets found
                </span>
                <TableExportDropdown
                  data={linkedAssets.map(asset => ({
                    'Parent Asset': asset.fromAsset.name,
                    'Parent Serial': asset.fromAsset.serialNumber,
                    'Child Asset': asset.toAsset.name,
                    'Child Serial': asset.toAsset.serialNumber,
                    'Linked Date': new Date(asset.createdAt).toLocaleDateString()
                  }))}
                  columns={[
                    { header: 'Parent Asset', key: 'Parent Asset' },
                    { header: 'Parent Serial', key: 'Parent Serial' },
                    { header: 'Child Asset', key: 'Child Asset' },
                    { header: 'Child Serial', key: 'Child Serial' },
                    { header: 'Linked Date', key: 'Linked Date' }
                  ]}
                  title="Linked Assets Report"
                  type="linked"
                  filterSummary={getFilterDisplayText()}
                />
              </div>
            </div>
            {loadingLinkedAssets ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
              </div>
            ) : linkedAssets.length > 0 ? (
              <div className="overflow-x-auto">
                <RoleBasedTable
                  data={linkedAssets}
                  columns={[
                    {
                      header: 'Parent Asset',
                      key: 'fromAsset.name',
                      render: (_, item) => (
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">{item.fromAsset.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{item.fromAsset.serialNumber}</div>
                        </div>
                      ),
                    },
                    {
                      header: 'Child Asset',
                      key: 'toAsset.name',
                      render: (_, item) => (
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">{item.toAsset.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{item.toAsset.serialNumber}</div>
                        </div>
                      ),
                    },
                    {
                      header: 'Linked Date',
                      key: 'createdAt',
                      render: (_, item) => new Date(item.createdAt).toLocaleDateString(),
                    }
                  ]}
                  className="bg-white dark:bg-gray-800"
                />
              </div>
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                No linked assets found
              </div>
            )}
          </div>
        </div>
      )}


    </div>
  );
}