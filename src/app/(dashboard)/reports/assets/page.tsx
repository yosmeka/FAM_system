'use client';

import { useState, useEffect, useCallback } from 'react';
import { RoleBasedTable } from '@/components/ui/RoleBasedTable';
import { PaginatedTable } from '@/components/ui/PaginatedTable';
import { RoleBasedChart } from '@/components/ui/RoleBasedChart';
import { RoleBasedStats } from '@/components/ui/RoleBasedStats';
import { AdvancedFilters, FilterValues, FilterOptions } from '@/components/reports/AdvancedFilters';
import { TableExportDropdown } from '@/components/reports/TableExportDropdown';
import { DepreciationAnalytics } from '@/components/reports/DepreciationAnalytics';
import { Download, ChevronDown } from 'lucide-react';
import { BackButton } from '@/components/ui/BackButton';
import { toast } from 'react-hot-toast';
import type {
  AssetStatusData,
  AssetCategoryData
} from '@/types/reports';
import type { Asset, LinkedAsset } from '@/types/index';

import { useSession } from 'next-auth/react';
import { DepreciationScheduleModal } from '@/components/DepreciationScheduleModal';

export default function AssetReportsPage() {
  const { data: session, status } = useSession();
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [activeTab, setActiveTab] = useState('assetDetails');
  const [linkedAssets, setLinkedAssets] = useState<LinkedAsset[]>([]);
  const [loadingLinkedAssets, setLoadingLinkedAssets] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assetStats, setAssetStats] = useState<Record<string, number> | null>(null);
  const [assetsByCategory, setAssetsByCategory] = useState<AssetCategoryData[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<AssetStatusData[]>([]);
  const [detailedAssets, setDetailedAssets] = useState<Asset[]>([]);
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
    currentDepartment: 'all',
    location: 'all',
    status: 'all',
    minValue: '',
    maxValue: '',
    depreciationMethod: 'all'
  });

  // Pagination state
  const [paginationState, setPaginationState] = useState({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false
  });
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedAssetName, setSelectedAssetName] = useState<string | null>(null);

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

  const fetchAssetReports = useCallback(async (filters?: FilterValues, isRefresh = false, page = 1, limit = 25) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const queryString = buildQueryString(filters || currentFilters, page, limit);
      const url = `/api/reports/assets${queryString ? `?${queryString}` : ''}`;

      console.log('🔍 Frontend Debug: Fetching from URL:', url);

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch asset reports');
      const data = await response.json();

      console.log('🔍 Frontend Debug: Received data:', {
        statsCount: data.stats?.totalAssets,
        assetsCount: data.assets?.length,
        filterOptions: data.filterOptions,
        pagination: data.pagination,
        firstAssetBookValues: data.assets?.[0]?.bookValuesByMonth,
        hasYearFilter: !!(currentFilters.year || filters?.year),
        hasMonthFilter: !!(currentFilters.month || filters?.month)
      });

      setAssetStats(data.stats);
      setAssetsByCategory(data.byCategory);
      setStatusDistribution(data.statusDistribution);
      setDetailedAssets(data.assets || []);
      setLinkedAssets(data.linkedAssets || []);

      // Update pagination state
      if (data.pagination) {
        setPaginationState(data.pagination);
      }

      if (data.filterOptions) {
        setFilterOptions(data.filterOptions);
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
  }, [currentFilters]);

  useEffect(() => {
    fetchAssetReports(currentFilters, false, paginationState.page, paginationState.limit);
  }, []);

  useEffect(() => {
    if (activeTab === 'linkedAssets') {
      fetchLinkedAssets();
    }
  }, [activeTab]);

  const buildQueryString = (filters: FilterValues, page = 1, limit = 25) => {
    const params = new URLSearchParams();

    // Add filter parameters
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all' && value !== '') {
        params.append(key, value);
      }
    });

    // Add pagination parameters
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const queryString = params.toString();
    console.log('🔍 Frontend Debug: Built query string:', queryString);
    console.log('🔍 Frontend Debug: Active filters:', filters);

    return queryString;
  };

  const fetchLinkedAssets = async () => {
    try {
      setLoadingLinkedAssets(true);
      const response = await fetch('/api/test/linked-assets', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch linked assets');
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
    // Reset to first page when filters change
    setPaginationState(prev => ({ ...prev, page: 1 }));
    fetchAssetReports(filters, false, 1, paginationState.limit);
  };

  const handleRefresh = () => {
    fetchAssetReports(currentFilters, true, paginationState.page, paginationState.limit);
  };

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setPaginationState(prev => ({ ...prev, page }));
    fetchAssetReports(currentFilters, false, page, paginationState.limit);
  };

  const handleItemsPerPageChange = (limit: number) => {
    setPaginationState(prev => ({ ...prev, page: 1, limit }));
    fetchAssetReports(currentFilters, false, 1, limit);
  };

  const hasActiveFilters = Object.values(currentFilters).some(value =>
    value !== '' && value !== 'all'
  );

  const getFilterDisplayText = () => {
    const activeFilters = [];

    if (currentFilters.category && currentFilters.category !== 'all') {
      activeFilters.push(`Category: ${currentFilters.category}`);
    }
    if (currentFilters.status && currentFilters.status !== 'all') {
      activeFilters.push(`Status: ${currentFilters.status}`);
    }
    if (currentFilters.currentDepartment && currentFilters.currentDepartment !== 'all') {
      activeFilters.push(`Department: ${currentFilters.currentDepartment}`);
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
      
      const doc = new jsPDF('landscape'); // Use landscape for more columns
      
      doc.setFontSize(16);
      doc.text('Asset Report', 14, 15);
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

      // Summary Statistics
      doc.setFontSize(12);
      doc.text('Summary Statistics', 14, 35);
      
      const statsData: string[][] = [
        ['Total Assets', (assetStats?.totalAssets || 0).toString()],
        ['Active Assets', (assetStats?.activeAssets || 0).toString()],
        ['Total Value', `$${Number(assetStats?.totalValue || 0).toLocaleString()}`],
        ['Total Depreciation', `$${Number(assetStats?.totalDepreciation || 0).toLocaleString()}`]
      ];

      autoTable(doc, {
        startY: 40,
        head: [['Metric', 'Value']],
        body: statsData,
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 5 },
        headStyles: { fillColor: [255, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold' },
      });

      // Detailed Asset List
      doc.addPage();
      doc.setFontSize(12);
      doc.text('Detailed Asset List', 14, 20);

      // Dynamic headers based on filter selection
      const baseHeaders = [
        'Description', 'Serial #', 'Old Tag #', 'New Tag #', 'GRN #', 'GRN Date', 
        'Unit Price', 'SIV #', 'SIV Date', 'Department', 'Remark', 
        'Useful Life', 'Residual %'
      ];

      const bookValueHeaders = (currentFilters.year && !currentFilters.month)
        ? Array.from({ length: 12 }, (_, i) => 
            `BV ${new Date(0, i).toLocaleString('default', { month: 'short' })}`
          )
        : ['Book Value'];

      const tableHeaders = [...baseHeaders, ...bookValueHeaders, 'Status'];
      
      const tableRows: string[][] = detailedAssets.map(asset => {
        const baseRow = [
          asset.itemDescription || '',
          asset.serialNumber || '',
          asset.oldTagNumber || '',
          asset.newTagNumber || '',
          asset.grnNumber || '',
          asset.grnDate ? new Date(asset.grnDate).toLocaleDateString() : '',
          asset.unitPrice ? `$${Number(asset.unitPrice).toFixed(2)}` : '',
          asset.sivNumber || '',
          asset.sivDate ? new Date(asset.sivDate).toLocaleDateString() : '',
          asset.department || asset.currentDepartment || '',
          asset.remark || '',
          asset.usefulLifeYears?.toString() || '',
          asset.residualPercentage ? `${asset.residualPercentage}%` : ''
        ];

        const bookValueCells = (currentFilters.year && !currentFilters.month)
          ? Array.from({ length: 12 }, (_, i) => {
              const monthValue = asset.bookValuesByMonth ? asset.bookValuesByMonth[i + 1] : undefined;
              return monthValue ? `$${Number(monthValue).toFixed(2)}` : '';
            })
          : [asset.bookValue ? `$${Number(asset.bookValue).toFixed(2)}` : ''];

        return [...baseRow, ...bookValueCells, asset.status || ''];
      });

      autoTable(doc, {
        startY: 25,
        head: [tableHeaders],
        body: tableRows,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [255, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold' },
      });

      doc.save(`asset-report-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF report exported successfully!');
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast.error('Failed to export PDF');
    }
  };

  const exportToExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      
      const workbook = XLSX.utils.book_new();

      // Summary Statistics
      const statsData: (string | number)[][] = [
        ['Summary Statistics', ''],
        ['Metric', 'Value'],
        ['Total Assets', assetStats?.totalAssets || 0],
        ['Active Assets', assetStats?.activeAssets || 0],
        ['Total Value', assetStats?.totalValue || 0],
        ['Total Depreciation', assetStats?.totalDepreciation || 0]
      ];
      const statsSheet = XLSX.utils.aoa_to_sheet(statsData);
      XLSX.utils.book_append_sheet(workbook, statsSheet, 'Summary');

      // Category Distribution
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

      // Detailed Asset List
      const baseAssetHeaders = [
        'Description', 'Serial Number', 'Old Tag #', 'New Tag #', 'GRN #', 'GRN Date',
        'Unit Price', 'SIV #', 'SIV Date', 'Department', 'Remark', 
        'Useful Life (Years)', 'Residual %'
      ];

      const bookValueHeaders = (currentFilters.year && !currentFilters.month)
        ? Array.from({ length: 12 }, (_, i) => 
            `Book Value (${new Date(0, i).toLocaleString('default', { month: 'short' })})`
          )
        : ['Book Value'];

      const assetHeaders = [...baseAssetHeaders, ...bookValueHeaders, 'Status'];
      const headerPadding = Array(assetHeaders.length - 1).fill('');

      const assetsData: (string | number)[][] = [
        ['Detailed Asset List', ...headerPadding],
        assetHeaders,
        ...detailedAssets.map(asset => {
          const baseRow = [
            asset.itemDescription || '',
            asset.serialNumber || '',
            asset.oldTagNumber || '',
            asset.newTagNumber || '',
            asset.grnNumber || '',
            asset.grnDate ? new Date(asset.grnDate).toLocaleDateString() : '',
            asset.unitPrice ? Number(asset.unitPrice).toFixed(2) : '',
            asset.sivNumber || '',
            asset.sivDate ? new Date(asset.sivDate).toLocaleDateString() : '',
            asset.department || asset.currentDepartment || '',
            asset.remark || '',
            asset.usefulLifeYears || '',
            asset.residualPercentage ? `${asset.residualPercentage}%` : ''
          ];

          const bookValueCells = (currentFilters.year && !currentFilters.month)
            ? Array.from({ length: 12 }, (_, i) => {
                const monthValue = asset.bookValuesByMonth ? asset.bookValuesByMonth[i + 1] : undefined;
                return monthValue ? Number(monthValue).toFixed(2) : '';
              })
            : [asset.bookValue ? Number(asset.bookValue).toFixed(2) : ''];

          return [...baseRow, ...bookValueCells, asset.status || ''];
        })
      ];
      const assetsSheet = XLSX.utils.aoa_to_sheet(assetsData);
      XLSX.utils.book_append_sheet(workbook, assetsSheet, 'Assets');

      // Linked Assets
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
      toast.success('Excel report exported successfully!');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Failed to export Excel file');
    }
  };

  const exportToCSV = () => {
    try {
      // Summary Statistics CSV
      const statsHeaders = ['Metric', 'Value'];
      const statsRows = [
        ['Total Assets', assetStats?.totalAssets || 0],
        ['Active Assets', assetStats?.activeAssets || 0],
        ['Total Value', assetStats?.totalValue || 0],
        ['Total Depreciation', assetStats?.totalDepreciation || 0]
      ];
      const statsContent = [statsHeaders, ...statsRows].map(row => row.join(',')).join('\n');
      const statsBlob = new Blob([statsContent], { type: 'text/csv;charset=utf-8;' });
      const statsLink = document.createElement('a');
      statsLink.href = URL.createObjectURL(statsBlob);
      statsLink.download = `asset-report-summary-${new Date().toISOString().split('T')[0]}.csv`;
      statsLink.click();

      // Category Distribution CSV
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

      // Detailed Assets CSV
      const baseAssetHeaders = [
        'Description', 'Serial Number', 'Old Tag #', 'New Tag #', 'GRN #', 'GRN Date',
        'Unit Price', 'SIV #', 'SIV Date', 'Department', 'Remark', 
        'Useful Life (Years)', 'Residual %'
      ];

      const bookValueHeaders = (currentFilters.year && !currentFilters.month)
        ? Array.from({ length: 12 }, (_, i) => 
            `Book Value (${new Date(0, i).toLocaleString('default', { month: 'short' })})`
          )
        : ['Book Value'];

      const assetHeaders = [...baseAssetHeaders, ...bookValueHeaders, 'Status'];

      const assetRows = detailedAssets.map(asset => {
        const baseRow = [
          asset.itemDescription || '',
          asset.serialNumber || '',
          asset.oldTagNumber || '',
          asset.newTagNumber || '',
          asset.grnNumber || '',
          asset.grnDate ? new Date(asset.grnDate).toLocaleDateString() : '',
          asset.unitPrice ? `$${Number(asset.unitPrice).toFixed(2)}` : '',
          asset.sivNumber || '',
          asset.sivDate ? new Date(asset.sivDate).toLocaleDateString() : '',
          asset.department || asset.currentDepartment || '',
          asset.remark || '',
          asset.usefulLifeYears || '',
          asset.residualPercentage ? `${asset.residualPercentage}%` : ''
        ];

        const bookValueCells = (currentFilters.year && !currentFilters.month)
          ? Array.from({ length: 12 }, (_, i) => {
              const monthValue = asset.bookValuesByMonth ? asset.bookValuesByMonth[i + 1] : undefined;
              return monthValue ? `$${Number(monthValue).toFixed(2)}` : '';
            })
          : [asset.bookValue ? `$${Number(asset.bookValue).toFixed(2)}` : ''];

        return [...baseRow, ...bookValueCells, asset.status || ''];
      });
      const assetContent = [assetHeaders, ...assetRows].map(row => row.join(',')).join('\n');
      const assetBlob = new Blob([assetContent], { type: 'text/csv;charset=utf-8;' });
      const assetLink = document.createElement('a');
      assetLink.href = URL.createObjectURL(assetBlob);
      assetLink.download = `asset-report-detailed-${new Date().toISOString().split('T')[0]}.csv`;
      assetLink.click();

      // Linked Assets CSV
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

      <AdvancedFilters
        filterOptions={filterOptions}
        onFiltersChange={handleFiltersChange}
        onRefresh={handleRefresh}
        isLoading={loading || refreshing}
      />

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
          name={currentFilters.year && currentFilters.month ?
            `Book Value (${new Date(0, parseInt(currentFilters.month) - 1).toLocaleString('default', { month: 'long' })} ${currentFilters.year})` :
            currentFilters.year ? `Book Value (${currentFilters.year})` : "Current Book Value"
          }
          value={new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
          }).format(assetStats?.totalBookValue || 0)}
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
              onClick={() => setActiveTab('depreciationAnalytics')}
              className={`${
                activeTab === 'depreciationAnalytics'
                  ? 'border-red-500 text-red-600 dark:text-red-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              📊 Depreciation Analytics
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

      {/* Monthly Book Value Cards - Show when year is selected but not month */}
      {currentFilters.year && !currentFilters.month && assetStats?.monthlyBookValueTotals && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            📊 Monthly Book Value Totals for {currentFilters.year}
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
              (Sum of all {assetStats.totalAssets || 0} filtered assets' book values per month)
            </span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12 gap-3">
            {Array.from({ length: 12 }, (_, index) => {
              const monthNum = index + 1;
              const monthName = new Date(0, index).toLocaleString('default', { month: 'short' });
              const monthValue = (assetStats.monthlyBookValueTotals as any)?.[monthNum] || 0;

              return (
                <div key={monthNum} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                      {monthName}
                    </div>
                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        maximumFractionDigits: 0,
                        notation: monthValue > 1000000 ? 'compact' : 'standard'
                      }).format(monthValue)}
                    </div>
                    {monthValue > 0 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {((monthValue / (assetStats.totalPurchaseValue || 1)) * 100).toFixed(1)}% of original
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Debug Information */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs">
              <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">🔍 Debug Info:</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p><strong>Assets with monthly data:</strong> {detailedAssets.filter(asset => (asset as any).bookValuesByMonth && Object.keys((asset as any).bookValuesByMonth).length > 0).length}</p>
                  <p><strong>Total assets:</strong> {detailedAssets.length}</p>
                </div>
                <div>
                  <p><strong>Monthly totals received:</strong> {Object.keys(assetStats.monthlyBookValueTotals || {}).length}</p>
                  <p><strong>Sample Jan total:</strong> ${((assetStats.monthlyBookValueTotals as any)?.[1] || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}

          {/* Summary for the year */}
          <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg border border-blue-200 dark:border-blue-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                  📈 {currentFilters.year} Book Value Summary
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Total depreciation across all months for the selected year
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    maximumFractionDigits: 0
                  }).format(
                    Array.from({ length: 12 }, (_, i) => (assetStats.monthlyBookValueTotals as any)?.[i + 1] || 0)
                      .reduce((sum, value) => sum + value, 0) / 12
                  )}
                </div>
                <div className="text-xs text-blue-500 dark:text-blue-400">
                  Average monthly book value
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'assetDetails' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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
                    customColors: ['#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E', '#10B981']
                  }}
                />
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400">No data available for current filters</div>
              )}
            </div>

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
                  ]}
                  className="bg-white dark:bg-gray-800"
                />
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400">No data available for current filters</div>
              )}
            </div>
          </div>

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
                      { header: 'GRN Number', key: 'grnNumber' },
                      { header: 'GRN Date', key: 'grnDate' },
                      { header: 'SIV Number', key: 'sivNumber' },
                      { header: 'SIV Date', key: 'sivDate' },
                      { header: 'Remark', key: 'remark' },
                      { header: 'Useful Life (Years)', key: 'usefulLifeYears' },
                      { header: 'Residual Percentage', key: 'residualPercentage' },
                      { header: 'Unit Price', key: 'unitPrice' },
                      { header: 'Warranty Expiry', key: 'warrantyExpiry' },
                      // Conditional book value columns
                      ...((currentFilters.year && !currentFilters.month)
                        ? Array.from({ length: 12 }, (_, i) => ({
                            header: `Book Value (${new Date(0, i).toLocaleString('default', { month: 'short' })})`,
                            key: `bookValueMonth${i + 1}`
                          }))
                        : [{ header: 'Book Value', key: 'bookValue' }]
                      )
                    ]}
                    title="Detailed Asset List"
                    type="detailed"
                    filterSummary={getFilterDisplayText()}
                  />
                </div>
              </div>
              {detailedAssets.length > 0 ? (
                <PaginatedTable
                  data={detailedAssets}
                  defaultItemsPerPage={25}
                  itemsPerPageOptions={[10, 25, 50, 100]}
                  searchPlaceholder="Search assets by name, serial number, department..."
                  serverSide={true}
                  pagination={paginationState}
                  onPageChange={handlePageChange}
                  onItemsPerPageChange={handleItemsPerPageChange}
                  loading={loading || refreshing}
                  columns={[
                      {
                        header: 'Description',
                        key: 'itemDescription',
                        render: (_, item) => item.itemDescription || '—',
                      },
                      {
                        header: 'Serial Number',
                        key: 'serialNumber',
                        render: (_, item) => item.serialNumber || '—',
                      },
                      {
                        header: 'Old Tag #',
                        key: 'oldTagNumber',
                        render: (_, item) => item.oldTagNumber || '—',
                      },
                      {
                        header: 'New Tag #',
                        key: 'newTagNumber',
                        render: (_, item) => item.newTagNumber || '—',
                      },
                      {
                        header: 'GRN #',
                        key: 'grnNumber',
                        render: (_, item) => item.grnNumber || '—',
                      },
                      {
                        header: 'GRN Date',
                        key: 'grnDate',
                        render: (_, item) => item.grnDate ? new Date(item.grnDate).toLocaleDateString() : '—',
                      },
                      {
                        header: 'Unit Price',
                        key: 'unitPrice',
                        render: (_, item) => item.unitPrice !== undefined && item.unitPrice !== null ? `$${Number(item.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—',
                      },
                      {
                        header: 'SIV #',
                        key: 'sivNumber',
                        render: (_, item) => item.sivNumber || '—',
                      },
                      {
                        header: 'SIV Date',
                        key: 'sivDate',
                        render: (_, item) => item.sivDate ? new Date(item.sivDate).toLocaleDateString() : '—',
                      },
                      {
                        header: 'Department',
                        key: 'currentDepartment',
                        render: (_, item) => item.department || item.currentDepartment || '—',
                      },
                      {
                        header: 'Remark',
                        key: 'remark',
                        render: (_, item) => item.remark || '—',
                      },
                      {
                        header: 'Useful Life (Years)',
                        key: 'usefulLifeYears',
                        render: (_, item) => item.usefulLifeYears !== undefined && item.usefulLifeYears !== null ? item.usefulLifeYears : '—',
                      },
                      {
                        header: 'Residual %',
                        key: 'residualPercentage',
                        render: (_, item) => item.residualPercentage !== undefined && item.residualPercentage !== null ? `${item.residualPercentage}%` : '—',
                      },
                      // Book Value columns (conditional)
                      ...((currentFilters.year && !currentFilters.month)
                        ? Array.from({ length: 12 }, (_, i) => {
                            const monthNum = i + 1;
                            const monthLabel = new Date(0, i).toLocaleString('default', { month: 'short' });
                            return {
                              header: `Book Value (${monthLabel})`,
                              key: `bookValueMonth${monthNum}`,
                              render: (_, item) => {
                                const value = item.bookValuesByMonth ? item.bookValuesByMonth[monthNum] : undefined;
                                return value !== undefined && value !== null
                                  ? `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                  : '—';
                              },
                            };
                          })
                        : [{
                            header: 'Book Value',
                            key: 'bookValue',
                            render: (_, item) => {
                              const bookValue = item.bookValue || item.currentValue;
                              return bookValue !== undefined && bookValue !== null 
                                ? `$${Number(bookValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                                : '—';
                            },
                          }]
                      ),
                      {
                        header: 'Status',
                        key: 'status',
                        render: (_, item) => item.status || '—',
                      },
                    ]}
                    className="bg-white dark:bg-gray-800"
                  />
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400">No assets found for current filters</div>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'depreciationAnalytics' && (
        <div className="space-y-6">
          {assetStats && (
            <DepreciationAnalytics
              stats={{
                totalCurrentBookValue: assetStats.totalCurrentBookValue || 0,
                totalAccumulatedDepreciation: assetStats.totalAccumulatedDepreciation || 0,
                averageDepreciationRate: assetStats.averageDepreciationRate || 0,
                assetsActivelyDepreciating: assetStats.assetsActivelyDepreciating || 0,
                assetsFullyDepreciated: assetStats.assetsFullyDepreciated || 0,
                assetsNotStarted: assetStats.assetsNotStarted || 0,
                depreciationEndingIn12Months: assetStats.depreciationEndingIn12Months || 0,
                depreciationByMethod: Array.isArray(assetStats.depreciationByMethod) ? assetStats.depreciationByMethod : [],
                totalPurchaseValue: assetStats.totalPurchaseValue || 0
              }}
            />
          )}

          {(!assetStats || !Array.isArray(assetStats.depreciationByMethod) || assetStats.depreciationByMethod.length === 0) && (
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg text-center">
              <div className="text-gray-400 dark:text-gray-500 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No Depreciation Data Available
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Depreciation analytics will appear here once assets with depreciation data are available.
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Make sure assets have SIV dates and depreciation methods configured.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'linkedAssets' && (
        <div className="bg-white rounded-lg shadow dark:bg-gray-900 mb-8">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-black dark:text-white">
                Linked Assets Report
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {linkedAssets.length} linked assets found
                </span>
                <TableExportDropdown
                  data={linkedAssets.map((asset: LinkedAsset) => ({
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
                      key: 'fromAsset',
                      render: (_, item) => item.fromAsset.name,
                    },
                    {
                      header: 'Parent Serial',
                      key: 'fromAsset',
                      render: (_, item) => item.fromAsset.serialNumber,
                    },
                    {
                      header: 'Child Asset',
                      key: 'toAsset',
                      render: (_, item) => item.toAsset.name,
                    },
                    {
                      header: 'Child Serial',
                      key: 'toAsset',
                      render: (_, item) => item.toAsset.serialNumber,
                    },
                    {
                      header: 'Linked Date',
                      key: 'createdAt',
                      render: (_, item) => new Date(item.createdAt).toLocaleDateString(),
                    },
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

      <DepreciationScheduleModal
        open={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        assetId={selectedAssetId || ''}
        assetName={selectedAssetName || ''}
      />
    </div>
  );
}
