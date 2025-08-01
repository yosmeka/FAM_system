'use client';

import { useState, useEffect, useCallback } from 'react';
import { RoleBasedTable } from '@/components/ui/RoleBasedTable';
import { PaginatedTable } from '@/components/ui/PaginatedTable';
import { RoleBasedChart } from '@/components/ui/RoleBasedChart';
import { RoleBasedStats } from '@/components/ui/RoleBasedStats';
import { AdvancedFilters, FilterValues, FilterOptions } from '@/components/reports/AdvancedFilters';
import { TableExportDropdown } from '@/components/reports/TableExportDropdown';
// import { DepreciationAnalytics } from '@/components/reports/DepreciationAnalytics';
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
    depreciationMethod: 'all',
    year: '',
    month: '',
    // Ensure all depreciation filters are also set to defaults
    depreciationStatus: 'all',
    minBookValue: '',
    maxBookValue: '',
    minDepreciationRate: '',
    maxDepreciationRate: '',
    assetAge: 'all',
    usefulLifeRange: 'all',
    sivDateFrom: '',
    sivDateTo: '',
    depreciationEndingSoon: false,
    residualPercentageRange: 'all'
  });

  // Pagination removed - all filtered assets displayed
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

  const fetchAssetReports = useCallback(async (filters?: FilterValues, isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const queryString = buildQueryString(filters || currentFilters);
      const url = `/api/reports/assets${queryString ? `?${queryString}` : ''}`;

      console.log('🔍 Frontend Debug: Fetching from URL:', url);
      console.log('🔍 Frontend Debug: Loading ALL assets for complete reporting (no artificial limits)');

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
      setAssetsByCategory(data.byCategory || []);
      setStatusDistribution(data.statusDistribution || []);
      setDetailedAssets(data.assets || []);
      setLinkedAssets(data.linkedAssets || []);

      // Pagination removed - all assets returned

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
    // On initial load, fetch without any filters to ensure no default filters are applied
    console.log('🔍 Frontend Debug: Initial load - fetching without filters');
    fetchAssetReports({
      startDate: '',
      endDate: '',
      category: 'all',
      currentDepartment: 'all',
      location: 'all',
      status: 'all',
      minValue: '',
      maxValue: '',
      depreciationMethod: 'all',
      year: '',
      month: ''
    }, false);
  }, []);

  useEffect(() => {
    if (activeTab === 'linkedAssets') {
      fetchLinkedAssets();
    }
  }, [activeTab]);

  const buildQueryString = (filters: FilterValues) => {
    const params = new URLSearchParams();

    // Add filter parameters - only add non-default values
    Object.entries(filters).forEach(([key, value]) => {
      // Skip default values and empty values
      if (value && value !== 'all' && value !== '' && value !== false) {
        params.append(key, value.toString());
      }
    });

    // Pagination removed - no page/limit parameters

    const queryString = params.toString();
    console.log('🔍 Frontend Debug: Built query string:', queryString);
    console.log('🔍 Frontend Debug: Original filters object:', filters);
    console.log('🔍 Frontend Debug: Filters being sent:', Object.fromEntries(params.entries()));

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
    fetchAssetReports(filters, false);
  };

  const handleRefresh = () => {
    fetchAssetReports(currentFilters, true);
  };

  // Pagination removed - all filtered assets displayed

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
            `DE ${new Date(0, i).toLocaleString('default', { month: 'short' })}`
          )
        : [];

      const tableHeaders = [...baseHeaders, ...bookValueHeaders, 'Status'];
      
      const tableRows: string[][] = safeDetailedAssets.map((asset: any) => {
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
              const monthValue = asset.depreciationExpensesByMonth ? asset.depreciationExpensesByMonth[i + 1] : undefined;
              return monthValue ? `$${Number(monthValue).toFixed(2)}` : '';
            })
          : [];

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
      toast.loading('Generating Excel file...', { id: 'excel-export' });

      // Use detailedAssets directly (contains ALL filtered data since pagination is removed)
      const allFilteredAssets = safeDetailedAssets;

      console.log('🔍 Excel Export Debug: Starting export...');
      console.log('🔍 Excel Export Debug: Current filters:', currentFilters);
      console.log('🔍 Excel Export Debug: Total assets to export:', allFilteredAssets.length);

      // Check for large dataset and warn user
      if (allFilteredAssets.length > 5000) {
        const proceed = confirm(
          `You are about to export ${allFilteredAssets.length.toLocaleString()} assets. ` +
          `This may create a large file and take some time. ` +
          `Consider applying filters to reduce the dataset. ` +
          `Do you want to continue?`
        );
        if (!proceed) {
          toast.error('Export cancelled', { id: 'excel-export' });
          return;
        }
      }

      // Debug first few assets for monthly data
      if (currentFilters.year && !currentFilters.month && allFilteredAssets.length > 0) {
        console.log('🔍 Excel Export Debug: First 3 assets monthly data:');
        console.log('🔍 Excel Export Debug: Current year filter:', currentFilters.year);
        allFilteredAssets.slice(0, 3).forEach((asset: any, index) => {
          console.log(`  Asset ${index + 1} (${asset.name}):`, {
            hasDepreciationExpensesByMonth: !!asset.depreciationExpensesByMonth,
            monthlyDataType: typeof asset.depreciationExpensesByMonth,
            monthlyDataKeys: asset.depreciationExpensesByMonth ? Object.keys(asset.depreciationExpensesByMonth) : [],
            sampleMonthlyValues: asset.depreciationExpensesByMonth ? {
              month1: asset.depreciationExpensesByMonth[1],
              month6: asset.depreciationExpensesByMonth[6],
              month7: asset.depreciationExpensesByMonth[7],
              month12: asset.depreciationExpensesByMonth[12]
            } : null,
            fullDepreciationExpensesByMonth: asset.depreciationExpensesByMonth
          });
        });
      }

      // Add debug function to window for easy browser console access
      if (typeof window !== 'undefined') {
        (window as any).debugMonthlyExport = () => {
          console.log('🔍 Debug Monthly Export Data:');
          console.log('Current filters:', currentFilters);
          console.log('Total assets:', allFilteredAssets.length);

          if (currentFilters.year && !currentFilters.month) {
            console.log('First 5 assets monthly data:');
            allFilteredAssets.slice(0, 5).forEach((asset: any, index) => {
              console.log(`Asset ${index + 1} (${asset.name}):`, {
                hasBookValuesByMonth: !!asset.bookValuesByMonth,
                monthlyDataType: typeof asset.bookValuesByMonth,
                monthlyDataKeys: asset.bookValuesByMonth ? Object.keys(asset.bookValuesByMonth) : [],
                monthlyDataValues: asset.bookValuesByMonth || 'No data'
              });
            });
          } else {
            console.log('Not a year-only filter - no monthly data expected');
          }
        };
      }
      console.log(`🔍 Export Debug: Exporting ${allFilteredAssets.length} assets`);

      const XLSX = await import('xlsx');
      const workbook = XLSX.utils.book_new();

      // Summary Statistics
      const statsData: (string | number)[][] = [
        ['Summary Statistics', ''],
        ['Metric', 'Value'],
        ['Total Assets', assetStats?.totalAssets || 0],
        ['Active Assets', assetStats?.activeAssets || 0],
        ['Total Value', assetStats?.totalValue || 0],
        ['Total Depreciation', assetStats?.totalDepreciation || 0],
        ['', ''],
        ['Export Details', ''],
        ['Total Exported Assets', allFilteredAssets.length],
        ['Export Date', new Date().toLocaleString()],
        ['Applied Filters', Object.entries(currentFilters).filter(([key, value]) => value && value !== 'all' && value !== '').map(([key, value]) => `${key}: ${value}`).join(', ') || 'None']
      ];
      const statsSheet = XLSX.utils.aoa_to_sheet(statsData);
      XLSX.utils.book_append_sheet(workbook, statsSheet, 'Summary');

      // Category Distribution
      const categoryData: (string | number)[][] = [
        ['Category Distribution', '', '', ''],
        ['Category', 'Status', 'Count', 'Total Value'],
        ...safeAssetsByCategory.map(item => [
          item.category || '',
          item.status || '',
          item.count || 0,
          Number(item.value || 0).toFixed(2)
        ])
      ];
      const categorySheet = XLSX.utils.aoa_to_sheet(categoryData);
      XLSX.utils.book_append_sheet(workbook, categorySheet, 'Categories');

      // Detailed Asset List - ALL FILTERED ASSETS
      const baseAssetHeaders = [
        'Asset Name', 'Description', 'Serial Number', 'Old Tag #', 'New Tag #', 'Category', 'Type',
        'Department', 'Location', 'Supplier', 'Status', 'Unit Price', 'Current Value',
        'Depreciation Rate', 'Age (Years)', 'Useful Life (Years)',
        'Residual %', 'Depreciation Method', 'SIV Date', 'GRN Date', 'Warranty Expiry',
        'Salvage Value', 'Calculated Salvage Value'
      ];

      // Add accumulated depreciation column if year and month are selected
      const accDepreciationHeaders = (currentFilters.year && currentFilters.month)
        ? [`Accumulated Depreciation (${currentFilters.month}/${currentFilters.year})`]
        : [];

      // Add yearly accumulated depreciation and monthly book value columns if year filter is applied (but not month)
      // Ethiopian budget year: July to June
      const bookValueHeaders = (currentFilters.year && !currentFilters.month)
        ? [
            // Yearly accumulated depreciation column first
            `Yearly Accumulated Depreciation (${currentFilters.year})`,
            // Book Value column
            `Book Value (${currentFilters.year})`,
            // Monthly columns after
            ...Array.from({ length: 12 }, (_, i) => {
              // Ethiopian budget year starts from July (month 7)
              const budgetMonth = ((i + 6) % 12) + 1; // July=7, Aug=8, ..., Dec=12, Jan=1, ..., June=6
              // Parse budget year format (e.g., "2024/2025" or "2024")
              let startYear = parseInt(currentFilters.year || '0');
              if (currentFilters.year && currentFilters.year.includes('/')) {
                startYear = parseInt(currentFilters.year.split('/')[0]);
              }
              const budgetYear = budgetMonth >= 7 ? startYear : startYear + 1;
              const monthName = new Date(0, budgetMonth - 1).toLocaleString('default', { month: 'short' });
              return `${monthName} ${budgetYear} Depreciation Expense`;
            })
          ]
        : [];

      const assetHeaders = [...baseAssetHeaders, ...accDepreciationHeaders, ...bookValueHeaders];
      const headerPadding = Array(assetHeaders.length - 1).fill('');

      // Process assets in chunks to prevent memory issues with large datasets
      const CHUNK_SIZE = 1000;
      const assetDataRows: (string | number)[][] = [];

      console.log('🔍 Excel Export Debug: Processing assets in chunks for memory efficiency...');

      for (let i = 0; i < allFilteredAssets.length; i += CHUNK_SIZE) {
        const chunk = allFilteredAssets.slice(i, i + CHUNK_SIZE);
        const chunkNumber = Math.floor(i / CHUNK_SIZE) + 1;
        const totalChunks = Math.ceil(allFilteredAssets.length / CHUNK_SIZE);

        console.log(`🔍 Excel Export Debug: Processing chunk ${chunkNumber}/${totalChunks} (${chunk.length} assets)`);

        // Update progress toast
        toast.loading(`Processing assets... ${chunkNumber}/${totalChunks}`, { id: 'excel-export' });

        const chunkRows = chunk.map((asset: any) => {
          // Determine accumulated depreciation to display based on filters
          let accumulatedDepreciationToShow = '';

          if (currentFilters.year && currentFilters.month) {
            // Specific month selected - use accumulatedDepreciation field
            accumulatedDepreciationToShow = asset.accumulatedDepreciation !== undefined && asset.accumulatedDepreciation !== null
              ? Number(asset.accumulatedDepreciation).toFixed(2)
              : '';
          } else {
            // No accumulated depreciation for other cases
            accumulatedDepreciationToShow = '';
          }

          const baseRow = [
            asset.name || '',
            asset.itemDescription || '',
            asset.serialNumber || '',
            asset.oldTagNumber || '',
            asset.newTagNumber || '',
            asset.category || '',
            asset.type || '',
            asset.currentDepartment || '',
            asset.location || '',
            asset.supplier || '',
            asset.status || '',
            asset.unitPrice || 0,
            asset.currentValue || 0,
            `${asset.depreciationRate || 0}%`,
            asset.age || 0,
            asset.usefulLifeYears || '',
            `${asset.residualPercentage || 0}%`,
            asset.depreciationMethod || '',
            asset.sivDate || '',
            asset.grnDate || '',
            asset.warrantyExpiry || '',
            asset.salvageValue || 0,
            asset.calculatedSalvageValue || 0
          ];

          // Add accumulated depreciation column if year and month are selected
          if (currentFilters.year && currentFilters.month) {
            baseRow.push(accumulatedDepreciationToShow);
          }

          // Add yearly accumulated depreciation and monthly depreciation expenses if year filter is applied (but not month)
          // Ethiopian budget year: July to June
          let depreciationExpenseCells: string[] = [];

          if (currentFilters.year && !currentFilters.month) {
            // Calculate yearly accumulated depreciation first
            let yearlyTotal = 0;
            for (let i = 0; i < 12; i++) {
              const budgetMonth = ((i + 6) % 12) + 1; // July=7, Aug=8, ..., Dec=12, Jan=1, ..., June=6
              const monthKey = budgetMonth.toString();
              const monthValue = asset.depreciationExpensesByMonth ? asset.depreciationExpensesByMonth[monthKey] || asset.depreciationExpensesByMonth[budgetMonth] : undefined;

              if (monthValue !== undefined && monthValue !== null && monthValue !== '') {
                const numValue = Number(monthValue);
                if (!isNaN(numValue)) {
                  yearlyTotal += numValue;
                }
              }
            }

            // Add yearly total column - always show the total, even if it's 0
            baseRow.push(yearlyTotal.toFixed(2));

            // Add book value column - calculated as unit price minus total accumulated depreciation, but never below salvage value
            try {
              const unitPrice = asset.unitPrice || 0;
              const residualPercentage = asset.residualPercentage || 0;
              const salvageValue = unitPrice * (residualPercentage / 100);

              // Parse the budget year (e.g., "2023/2024" -> 2023)
              let startYear = parseInt(currentFilters.year || '0');
              if (currentFilters.year && currentFilters.year.includes('/')) {
                startYear = parseInt(currentFilters.year.split('/')[0]);
              }

              // Calculate total accumulated depreciation up to the end of current budget year using precise calculation
              let totalAccumulatedDepreciation = 0;

              if (asset.sivDate) {
                try {
                  // Use the same precise calculation as depreciation schedule
                  const { calculateMonthlyDepreciation } = require('@/utils/depreciation');

                  const depreciationInput = {
                    unitPrice: unitPrice,
                    sivDate: new Date(asset.sivDate).toISOString().split('T')[0],
                    usefulLifeYears: asset.usefulLifeYears || 5,
                    salvageValue: salvageValue,
                    method: asset.depreciationMethod || 'STRAIGHT_LINE',
                  };

                  const monthlyResults = calculateMonthlyDepreciation(depreciationInput);

                  // Find the last month of the current budget year (June of next year)
                  const endOfBudgetYear = { year: startYear + 1, month: 6 };

                  // Find the result for that month to get precise accumulated depreciation
                  const endResult = monthlyResults.find(result =>
                    result.year === endOfBudgetYear.year && result.month === endOfBudgetYear.month
                  );

                  if (endResult) {
                    totalAccumulatedDepreciation = endResult.accumulatedDepreciation;
                  }
                } catch (error) {
                  console.error('Error calculating precise accumulated depreciation for Excel:', error);
                  // Fallback to old method if calculation fails
                  if (asset.depreciationExpensesByMonth) {
                    const sivDate = new Date(asset.sivDate);
                    const sivYear = sivDate.getFullYear();
                    const sivMonth = sivDate.getMonth() + 1;

                    for (let year = sivYear; year <= startYear + 1; year++) {
                      for (let month = 1; month <= 12; month++) {
                        if (year === sivYear && month < sivMonth) continue;
                        if (year === startYear + 1 && month > 6) break;
                        if (year > startYear + 1) break;

                        const monthValue = asset.depreciationExpensesByMonth[month];
                        if (monthValue !== undefined && monthValue !== null && !isNaN(Number(monthValue))) {
                          totalAccumulatedDepreciation += Number(monthValue);
                        }
                      }
                    }
                  }
                }
              }

              // Book Value = Depreciable Amount - Total Accumulated Depreciation, but never below 0
              const depreciableAmount = unitPrice - salvageValue;
              const bookValue = Math.max(depreciableAmount - totalAccumulatedDepreciation, 0);
              baseRow.push(bookValue.toFixed(6)); // Increased precision for Excel export

            } catch (error) {
              console.error('Error calculating book value for Excel export:', error);
              baseRow.push('0.00');
            }

            // Add monthly columns
            depreciationExpenseCells = Array.from({ length: 12 }, (_, i) => {
              // Ethiopian budget year starts from July (month 7)
              const budgetMonth = ((i + 6) % 12) + 1; // July=7, Aug=8, ..., Dec=12, Jan=1, ..., June=6
              const monthKey = budgetMonth.toString(); // Ensure string key
              const monthValue = asset.depreciationExpensesByMonth ? asset.depreciationExpensesByMonth[monthKey] || asset.depreciationExpensesByMonth[budgetMonth] : undefined;

              // Debug for first asset and first few months
              if (allFilteredAssets.indexOf(asset) === 0 && i < 3) {
                console.log(`🔍 Excel Export Debug: Month ${budgetMonth} (${monthKey}):`, {
                  monthValue,
                  hasDepreciationExpensesByMonth: !!asset.depreciationExpensesByMonth,
                  allKeys: asset.depreciationExpensesByMonth ? Object.keys(asset.depreciationExpensesByMonth) : []
                });
              }

              // More robust value checking for depreciation expenses
              if (monthValue !== undefined && monthValue !== null && monthValue !== '') {
                const numValue = Number(monthValue);
                if (!isNaN(numValue)) {
                  return numValue.toFixed(2);
                }
              }
              // Show 0.00 instead of blank for missing or invalid values
              return '0.00';
            });

            // Debug: Log monthly depreciation expense data for first few assets
            if (allFilteredAssets.indexOf(asset) < 3) {
              console.log(`🔍 Excel Export Debug: Asset ${asset.id} monthly depreciation expenses:`, {
                assetName: asset.name,
                hasDepreciationExpensesByMonth: !!asset.depreciationExpensesByMonth,
                monthlyDataKeys: asset.depreciationExpensesByMonth ? Object.keys(asset.depreciationExpensesByMonth) : [],
                monthlyDataType: typeof asset.depreciationExpensesByMonth,
                sampleValues: asset.depreciationExpensesByMonth ? {
                  month1: asset.depreciationExpensesByMonth[1],
                  month6: asset.depreciationExpensesByMonth[6],
                  month12: asset.depreciationExpensesByMonth[12]
                } : null,
                depreciationExpenseCellsLength: depreciationExpenseCells.length,
                depreciationExpenseCellsSample: depreciationExpenseCells.slice(0, 3),
                fullDepreciationExpenseCells: depreciationExpenseCells,
              });
            }

            baseRow.push(...depreciationExpenseCells);
          }

          return [...baseRow, ...depreciationExpenseCells];
        });

        // Add chunk rows to the main data array
        assetDataRows.push(...chunkRows);
      }

      // Combine all processed chunks into the final data array
      const assetsData: (string | number)[][] = [
        ['All Filtered Assets', ...headerPadding],
        assetHeaders,
        ...assetDataRows
      ];

      console.log(`🔍 Excel Export Debug: Finished processing ${allFilteredAssets.length} assets in ${Math.ceil(allFilteredAssets.length / CHUNK_SIZE)} chunks`);

      // Create the Excel sheet with memory optimization
      toast.loading('Creating Excel file...', { id: 'excel-export' });

      try {
        const assetsSheet = XLSX.utils.aoa_to_sheet(assetsData);

        // Set column widths for better readability
        const columnWidths = assetHeaders.map((header, index) => {
          if (header.includes('Book Value') || header.includes('Price') || header.includes('Value')) {
            return { wch: 15 }; // Wider for currency values
          } else if (header.includes('Date')) {
            return { wch: 12 }; // Medium for dates
          } else if (header.includes('Description') || header.includes('Name')) {
            return { wch: 25 }; // Wider for text
          } else {
            return { wch: 10 }; // Default width
          }
        });

        assetsSheet['!cols'] = columnWidths;

        XLSX.utils.book_append_sheet(workbook, assetsSheet, 'All Filtered Assets');

        // Clear the processed data from memory
        assetDataRows.length = 0;

      } catch (sheetError) {
        console.error('Error creating Excel sheet:', sheetError);
        throw new Error(`Failed to create Excel sheet: ${sheetError instanceof Error ? sheetError.message : 'Unknown error'}`);
      }

      // Linked Assets
      const linkedAssetsData: (string | number)[][] = [
        ['Linked Assets', '', '', '', ''],
        ['Parent Asset', 'Parent Serial', 'Child Asset', 'Child Serial', 'Linked Date'],
        ...safeLinkedAssets.map(asset => [
          asset.fromAsset.name || '',
          asset.fromAsset.serialNumber || '',
          asset.toAsset.name || '',
          asset.toAsset.serialNumber || '',
          new Date(asset.createdAt).toLocaleDateString()
        ])
      ];
      const linkedAssetsSheet = XLSX.utils.aoa_to_sheet(linkedAssetsData);
      XLSX.utils.book_append_sheet(workbook, linkedAssetsSheet, 'Linked Assets');

      // Export with improved error handling and file corruption prevention
      toast.loading('Saving Excel file...', { id: 'excel-export' });

      try {
        // Generate a more reliable filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const filterInfo = currentFilters.year
          ? `${currentFilters.year}${currentFilters.month ? `-${currentFilters.month.toString().padStart(2, '0')}` : ''}`
          : 'all';
        const filename = `asset-report-${filterInfo}-${timestamp}.xlsx`;

        console.log('🔍 Excel Export Debug: Writing Excel file...');

        // Use improved write method to prevent corruption
        const opts = {
          bookType: 'xlsx' as const,
          compression: true // Enable compression to reduce file size
        };

        // Create a write buffer instead of direct file write for better reliability
        const wbout = XLSX.write(workbook, { type: 'array', ...opts });

        // Convert to Blob with proper MIME type
        const blob = new Blob([wbout], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });

        // Create download link with proper cleanup
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';

        // Trigger download
        document.body.appendChild(a);
        a.click();

        // Cleanup resources
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);

        const fileSizeMB = (blob.size / 1024 / 1024).toFixed(2);
        console.log(`🔍 Excel Export Debug: Excel file created successfully (${fileSizeMB}MB)`);

        // Show success with file size info
        toast.success(
          `Excel report exported successfully! (${allFilteredAssets.length.toLocaleString()} assets, ${fileSizeMB}MB)`,
          { id: 'excel-export' }
        );

      } catch (writeError) {
        console.error('Error writing Excel file:', writeError);
        toast.error(
          `Failed to save Excel file: ${writeError instanceof Error ? writeError.message : 'Unknown error'}`,
          { id: 'excel-export' }
        );
        throw writeError;
      }
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error(`Failed to export Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'excel-export' });
    }
  };

  const exportToCSV = async () => {
    try {
      toast.loading('Generating CSV file...', { id: 'csv-export' });

      // Use detailedAssets directly (contains ALL filtered data since pagination is removed)
      const allFilteredAssets = safeDetailedAssets;

      console.log('🔍 CSV Export Debug: Starting export...');
      console.log('🔍 CSV Export Debug: Current filters:', currentFilters);
      console.log('🔍 CSV Export Debug: Total assets to export:', allFilteredAssets.length);

      // Debug first few assets for monthly data
      if (currentFilters.year && !currentFilters.month && allFilteredAssets.length > 0) {
        console.log('🔍 CSV Export Debug: First 3 assets monthly data:');
        allFilteredAssets.slice(0, 3).forEach((asset: any, index) => {
          console.log(`  Asset ${index + 1} (${asset.name}):`, {
            hasBookValuesByMonth: !!asset.bookValuesByMonth,
            monthlyDataType: typeof asset.bookValuesByMonth,
            monthlyDataKeys: asset.bookValuesByMonth ? Object.keys(asset.bookValuesByMonth) : [],
            sampleMonthlyValues: asset.bookValuesByMonth ? {
              month1: asset.bookValuesByMonth[1],
              month6: asset.bookValuesByMonth[6],
              month12: asset.bookValuesByMonth[12]
            } : null
          });
        });
      }
      console.log(`🔍 CSV Export Debug: Exporting ${allFilteredAssets.length} assets`);

      // Summary Statistics CSV
      const statsHeaders = ['Metric', 'Value'];
      const statsRows = [
        ['Total Assets', assetStats?.totalAssets || 0],
        ['Active Assets', assetStats?.activeAssets || 0],
        ['Total Value', assetStats?.totalValue || 0],
        ['Total Depreciation', assetStats?.totalDepreciation || 0],
        ['Total Exported Assets', allFilteredAssets.length],
        ['Export Date', new Date().toLocaleString()],
        ['Applied Filters', Object.entries(currentFilters).filter(([key, value]) => value && value !== 'all' && value !== '').map(([key, value]) => `${key}: ${value}`).join('; ') || 'None']
      ];
      const statsContent = [statsHeaders, ...statsRows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      const statsBlob = new Blob([statsContent], { type: 'text/csv;charset=utf-8;' });
      const statsLink = document.createElement('a');
      statsLink.href = URL.createObjectURL(statsBlob);
      statsLink.download = `asset-report-summary-${new Date().toISOString().split('T')[0]}.csv`;
      statsLink.click();

      // Category Distribution CSV
      const categoryHeaders = ['Category', 'Status', 'Count', 'Total Value'];
      const categoryRows = safeAssetsByCategory.map(item => [
        item.category || '',
        item.status || '',
        item.count || 0,
        Number(item.value || 0).toFixed(2)
      ]);
      const categoryContent = [categoryHeaders, ...categoryRows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      const categoryBlob = new Blob([categoryContent], { type: 'text/csv;charset=utf-8;' });
      const categoryLink = document.createElement('a');
      categoryLink.href = URL.createObjectURL(categoryBlob);
      categoryLink.download = `asset-report-categories-${new Date().toISOString().split('T')[0]}.csv`;
      categoryLink.click();

      // Detailed Assets CSV - ALL FILTERED ASSETS
      const baseAssetHeaders = [
        'Asset Name', 'Description', 'Serial Number', 'Old Tag #', 'New Tag #', 'Category', 'Type',
        'Department', 'Location', 'Supplier', 'Status', 'Unit Price', 'Current Value',
        'Depreciation Rate', 'Age (Years)', 'Useful Life (Years)',
        'Residual %', 'Depreciation Method', 'SIV Date', 'GRN Date', 'Warranty Expiry',
        'Salvage Value', 'Calculated Salvage Value'
      ];

      // Add accumulated depreciation column if year and month are selected
      const accDepreciationHeaders = (currentFilters.year && currentFilters.month)
        ? [`Accumulated Depreciation (${currentFilters.month}/${currentFilters.year})`]
        : [];

      // Add yearly accumulated depreciation and monthly depreciation expense headers if year filter is applied (but not month)
      // Ethiopian budget year: July to June
      const depreciationExpenseHeaders = (currentFilters.year && !currentFilters.month)
        ? [
            // Yearly accumulated depreciation header first
            `Yearly Accumulated Depreciation (${currentFilters.year})`,
            // Monthly headers after
            ...Array.from({ length: 12 }, (_, i) => {
              // Ethiopian budget year starts from July (month 7)
              const budgetMonth = ((i + 6) % 12) + 1; // July=7, Aug=8, ..., Dec=12, Jan=1, ..., June=6
              // Parse budget year format (e.g., "2024/2025" or "2024")
              let startYear = parseInt(currentFilters.year || '0');
              if (currentFilters.year && currentFilters.year.includes('/')) {
                startYear = parseInt(currentFilters.year.split('/')[0]);
              }
              const budgetYear = budgetMonth >= 7 ? startYear : startYear + 1;
              const monthName = new Date(0, budgetMonth - 1).toLocaleString('default', { month: 'short' });
              // Removed debug logging for performance
              return `${monthName} ${budgetYear} Depreciation Expense`;
            })
          ]
        : [];

      const assetHeaders = [...baseAssetHeaders, ...accDepreciationHeaders, ...depreciationExpenseHeaders];

      // Debug: Check for systematic first month issues across all assets
      if (currentFilters.year && !currentFilters.month && allFilteredAssets.length > 0) {
        let frontendAssetsWithFirstMonth = 0;
        let frontendAssetsWithoutFirstMonth = 0;
        let frontendFirstMonthStats: Record<number, number> = {};

        allFilteredAssets.slice(0, 10).forEach((asset: any) => { // Check first 10 assets
          if (asset.depreciationExpensesByMonth) {
            const months = Object.keys(asset.depreciationExpensesByMonth).map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b);
            const firstMonth = months[0];

            if (firstMonth && asset.depreciationExpensesByMonth[firstMonth] > 0) {
              frontendAssetsWithFirstMonth++;
              frontendFirstMonthStats[firstMonth] = (frontendFirstMonthStats[firstMonth] || 0) + 1;
            } else {
              frontendAssetsWithoutFirstMonth++;
            }
          }
        });

        console.log(`🔍 Frontend Debug: First Month Analysis:`, {
          checkedAssets: Math.min(10, allFilteredAssets.length),
          frontendAssetsWithFirstMonth,
          frontendAssetsWithoutFirstMonth,
          frontendFirstMonthDistribution: frontendFirstMonthStats
        });
      }

      const assetRows = allFilteredAssets.map((asset: any) => {
        // Determine accumulated depreciation to display based on filters
        let accumulatedDepreciationToShow = '';

        if (currentFilters.year && currentFilters.month) {
          // Specific month selected - use accumulatedDepreciation field
          accumulatedDepreciationToShow = asset.accumulatedDepreciation !== undefined && asset.accumulatedDepreciation !== null
            ? Number(asset.accumulatedDepreciation).toFixed(2)
            : '';
        } else {
          // No accumulated depreciation for other cases
          accumulatedDepreciationToShow = '';
        }

        const baseRow = [
          asset.name || '',
          asset.itemDescription || '',
          asset.serialNumber || '',
          asset.oldTagNumber || '',
          asset.newTagNumber || '',
          asset.category || '',
          asset.type || '',
          asset.currentDepartment || '',
          asset.location || '',
          asset.supplier || '',
          asset.status || '',
          asset.unitPrice || 0,
          asset.currentValue || 0,
          `${asset.depreciationRate || 0}%`,
          asset.age || 0,
          asset.usefulLifeYears || '',
          `${asset.residualPercentage || 0}%`,
          asset.depreciationMethod || '',
          asset.sivDate || '',
          asset.grnDate || '',
          asset.warrantyExpiry || '',
          asset.salvageValue || 0,
          asset.calculatedSalvageValue || 0
        ];

        // Add accumulated depreciation column if year and month are selected
        if (currentFilters.year && currentFilters.month) {
          baseRow.push(accumulatedDepreciationToShow);
        }

        // Add yearly accumulated depreciation and monthly depreciation expenses if year filter is applied (but not month)
        // Ethiopian budget year: July to June
        if (currentFilters.year && !currentFilters.month) {
          // Calculate yearly accumulated depreciation first
          let yearlyTotal = 0;
          for (let i = 0; i < 12; i++) {
            const budgetMonth = ((i + 6) % 12) + 1; // July=7, Aug=8, ..., Dec=12, Jan=1, ..., June=6
            const monthKey = budgetMonth.toString();
            const monthValue = asset.depreciationExpensesByMonth ? asset.depreciationExpensesByMonth[monthKey] || asset.depreciationExpensesByMonth[budgetMonth] : undefined;

            if (monthValue !== undefined && monthValue !== null && monthValue !== '') {
              const numValue = Number(monthValue);
              if (!isNaN(numValue)) {
                yearlyTotal += numValue;
              }
            }
          }

          // Add yearly total column
          baseRow.push(yearlyTotal > 0 ? yearlyTotal.toFixed(2) : '');

          // Add monthly columns
          for (let i = 0; i < 12; i++) {
            // Ethiopian budget year starts from July (month 7)
            const budgetMonth = ((i + 6) % 12) + 1; // July=7, Aug=8, ..., Dec=12, Jan=1, ..., June=6
            // Parse budget year format (e.g., "2024/2025" or "2024")
            let startYear = parseInt(currentFilters.year || '0');
            if (currentFilters.year && currentFilters.year.includes('/')) {
              startYear = parseInt(currentFilters.year.split('/')[0]);
            }
            const budgetYear = budgetMonth >= 7 ? startYear : startYear + 1;

            // Look up the value for this budget month and year
            const monthKey = budgetMonth.toString();
            const monthValue = asset.depreciationExpensesByMonth ? asset.depreciationExpensesByMonth[monthKey] || asset.depreciationExpensesByMonth[budgetMonth] : undefined;

            // Removed debug logging for performance

            // More robust value checking for depreciation expenses
            if (monthValue !== undefined && monthValue !== null && monthValue !== '') {
              const numValue = Number(monthValue);
              if (!isNaN(numValue)) {
                baseRow.push(numValue.toFixed(2));
                continue;
              }
            }
            baseRow.push('');
          }
        }

        // Debug: Log monthly depreciation expense data for first few assets in CSV export
        if ((currentFilters.year && !currentFilters.month) && allFilteredAssets.indexOf(asset) < 5) {
          console.log(`🔍 CSV Export Debug: Asset ${asset.id} monthly depreciation expenses:`, {
            assetName: asset.name,
            sivDate: asset.sivDate,
            hasDepreciationExpensesByMonth: !!asset.bookValuesByMonth,
            monthlyDataKeys: asset.bookValuesByMonth ? Object.keys(asset.bookValuesByMonth) : [],
            monthlyDataType: typeof asset.bookValuesByMonth,
            sampleValues: asset.bookValuesByMonth ? {
              month1: asset.bookValuesByMonth[1],
              month6: asset.bookValuesByMonth[6],
              month12: asset.bookValuesByMonth[12]
            } : null,
            baseRowLength: baseRow.length,
            baseRowSample: baseRow.slice(-5) // Last 5 items to see monthly data
          });
        }

        return baseRow.map(cell => `"${cell}"`);
      });

      const assetContent = [
        assetHeaders.map(header => `"${header}"`).join(','),
        ...assetRows.map(row => row.join(','))
      ].join('\n');
      const assetBlob = new Blob([assetContent], { type: 'text/csv;charset=utf-8;' });
      const assetLink = document.createElement('a');
      assetLink.href = URL.createObjectURL(assetBlob);
      const filename = `asset-report-detailed-${currentFilters.year ? `${currentFilters.year}${currentFilters.month ? `-${currentFilters.month.toString().padStart(2, '0')}` : ''}` : 'all'}-${new Date().toISOString().split('T')[0]}.csv`;
      assetLink.download = filename;
      assetLink.click();

      // Linked Assets CSV
      const linkedAssetsHeaders = ['Parent Asset', 'Parent Serial', 'Child Asset', 'Child Serial', 'Linked Date'];
      const linkedAssetsRows = safeLinkedAssets.map(asset => [
        asset.fromAsset.name || '',
        asset.fromAsset.serialNumber || '',
        asset.toAsset.name || '',
        asset.toAsset.serialNumber || '',
        new Date(asset.createdAt).toLocaleDateString()
      ]);
      const linkedAssetsContent = [
        linkedAssetsHeaders.map(header => `"${header}"`).join(','),
        ...linkedAssetsRows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');
      const linkedAssetsBlob = new Blob([linkedAssetsContent], { type: 'text/csv;charset=utf-8;' });
      const linkedAssetsLink = document.createElement('a');
      linkedAssetsLink.href = URL.createObjectURL(linkedAssetsBlob);
      linkedAssetsLink.download = `asset-report-linked-${new Date().toISOString().split('T')[0]}.csv`;
      linkedAssetsLink.click();

      toast.success(`CSV reports exported successfully! (${allFilteredAssets.length} assets)`, { id: 'csv-export' });
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error(`Failed to export CSV files: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'csv-export' });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px] bg-white dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500 dark:border-red-400"></div>
      </div>
    );
  }

  // Safety check to prevent undefined length errors
  const safeAssetsByCategory = assetsByCategory || [];
  const safeStatusDistribution = statusDistribution || [];
  const safeDetailedAssets = detailedAssets || [];
  const safeLinkedAssets = linkedAssets || [];

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
        currentFilters={currentFilters}
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
                  <p><strong>Assets with monthly data:</strong> {safeDetailedAssets.filter(asset => (asset as any).depreciationExpensesByMonth && Object.keys((asset as any).depreciationExpensesByMonth).length > 0).length}</p>
                  <p><strong>Total assets:</strong> {safeDetailedAssets.length}</p>
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
              {safeAssetsByCategory.length > 0 ? (
                <RoleBasedChart
                  type="pie"
                  data={safeAssetsByCategory}
                  options={{
                    labels: safeAssetsByCategory.map((item) => item.category),
                    values: safeAssetsByCategory.map((item) => item.count),
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
              {safeStatusDistribution.length > 0 ? (
                <RoleBasedChart
                  type="pie"
                  data={safeStatusDistribution}
                  options={{
                    labels: safeStatusDistribution.map((item) =>
                      item.status === 'UNDER_MAINTENANCE' ? 'Under Maintenance' :
                      item.status.charAt(0) + item.status.slice(1).toLowerCase()
                    ),
                    values: safeStatusDistribution.map((item) => item.count),
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
                  data={safeAssetsByCategory}
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
              {safeAssetsByCategory.length > 0 ? (
                <RoleBasedTable
                  data={safeAssetsByCategory}
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
                    {safeDetailedAssets.length} assets found
                  </span>
                  <TableExportDropdown
                    data={safeDetailedAssets}
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
                      // Conditional book value columns - Ethiopian budget year
                      ...((currentFilters.year && !currentFilters.month)
                        ? [
                            // Yearly accumulated depreciation column first
                            {
                              header: `Yearly Accumulated Depreciation (${currentFilters.year})`,
                              key: 'yearlyAccumulatedDepreciation',
                              render: (_: any, item: any) => {
                                if (!item.depreciationExpensesByMonth) return '0.00';

                                // Calculate total for Ethiopian budget year (July to June)
                                let total = 0;
                                for (let i = 0; i < 12; i++) {
                                  const budgetMonth = ((i + 6) % 12) + 1; // July=7, Aug=8, ..., Dec=12, Jan=1, ..., June=6
                                  const monthValue = item.depreciationExpensesByMonth[budgetMonth];
                                  if (monthValue !== undefined && monthValue !== null && !isNaN(Number(monthValue))) {
                                    total += Number(monthValue);
                                  }
                                }

                                // Always show the total, even if it's 0
                                return total.toFixed(2);
                              }
                            },
                            // Book Value column - calculated as previous year's book value minus current year's accumulated depreciation
                            {
                              header: `Book Value (${currentFilters.year})`,
                              key: 'bookValueForYear',
                              render: (_: any, item: any) => {
                                // Use the API-calculated book value instead of manual calculation
                                // This ensures the same precision as the depreciation schedule
                                const apiBookValue = item.bookValue;

                                if (apiBookValue !== undefined && apiBookValue !== null && !isNaN(Number(apiBookValue))) {
                                  return Number(apiBookValue).toFixed(6); // Show API-calculated precise value
                                }

                                // Fallback to manual calculation if API book value not available
                                try {
                                  const unitPrice = item.unitPrice || 0;
                                  const residualPercentage = item.residualPercentage || 0;
                                  const salvageValue = unitPrice * (residualPercentage / 100);

                                  // Parse the budget year (e.g., "2023/2024" -> 2023)
                                  let startYear = parseInt(currentFilters.year || '0');
                                  if (currentFilters.year && currentFilters.year.includes('/')) {
                                    startYear = parseInt(currentFilters.year.split('/')[0]);
                                  }

                                  // Calculate total accumulated depreciation up to the end of current budget year using precise calculation
                                  let totalAccumulatedDepreciation = 0;

                                  if (item.sivDate) {
                                    try {
                                      // Use the same precise calculation as depreciation schedule
                                      const { calculateMonthlyDepreciation } = require('@/utils/depreciation');

                                      const depreciationInput = {
                                        unitPrice: unitPrice,
                                        sivDate: new Date(item.sivDate).toISOString().split('T')[0],
                                        usefulLifeYears: item.usefulLifeYears || 5,
                                        salvageValue: salvageValue,
                                        method: item.depreciationMethod || 'STRAIGHT_LINE',
                                      };

                                      const monthlyResults = calculateMonthlyDepreciation(depreciationInput);

                                      // Find the last month of the current budget year (June of next year)
                                      const endOfBudgetYear = { year: startYear + 1, month: 6 };

                                      // Find the result for that month to get precise accumulated depreciation
                                      const endResult = monthlyResults.find(result =>
                                        result.year === endOfBudgetYear.year && result.month === endOfBudgetYear.month
                                      );

                                      if (endResult) {
                                        totalAccumulatedDepreciation = endResult.accumulatedDepreciation;
                                      }
                                    } catch (error) {
                                      console.error('Error calculating precise accumulated depreciation:', error);
                                      // Fallback to old method if calculation fails
                                      if (item.depreciationExpensesByMonth) {
                                        const sivDate = new Date(item.sivDate);
                                        const sivYear = sivDate.getFullYear();
                                        const sivMonth = sivDate.getMonth() + 1;

                                        for (let year = sivYear; year <= startYear + 1; year++) {
                                          for (let month = 1; month <= 12; month++) {
                                            if (year === sivYear && month < sivMonth) continue;
                                            if (year === startYear + 1 && month > 6) break;
                                            if (year > startYear + 1) break;

                                            const monthValue = item.depreciationExpensesByMonth[month];
                                            if (monthValue !== undefined && monthValue !== null && !isNaN(Number(monthValue))) {
                                              totalAccumulatedDepreciation += Number(monthValue);
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }

                                  // Book Value = Depreciable Amount - Total Accumulated Depreciation, but never below 0
                                  // Ensure accumulated depreciation doesn't exceed depreciable amount
                                  const depreciableAmount = unitPrice - salvageValue;
                                  const cappedAccumulatedDepreciation = Math.min(totalAccumulatedDepreciation, depreciableAmount);
                                  const bookValue = Math.max(depreciableAmount - cappedAccumulatedDepreciation, 0);

                                  return bookValue.toFixed(6); // Increased precision to show exact values

                                } catch (error) {
                                  console.error('Error calculating book value:', error);
                                  return '0.00';
                                }
                              }
                            },
                            // Monthly columns after
                            ...Array.from({ length: 12 }, (_, i) => {
                              // Ethiopian budget year starts from July (month 7)
                              const budgetMonth = ((i + 6) % 12) + 1; // July=7, Aug=8, ..., Dec=12, Jan=1, ..., June=6
                              // Parse budget year format (e.g., "2024/2025" or "2024")
                              let startYear = parseInt(currentFilters.year || '0');
                              if (currentFilters.year && currentFilters.year.includes('/')) {
                                startYear = parseInt(currentFilters.year.split('/')[0]);
                              }
                              const budgetYear = budgetMonth >= 7 ? startYear : startYear + 1;
                              const monthName = new Date(0, budgetMonth - 1).toLocaleString('default', { month: 'short' });
                              return {
                                header: `${monthName} ${budgetYear} Depreciation Expense`,
                                key: `depreciationExpenseMonth${budgetMonth}`,
                                render: (_: any, item: any) => {
                                  const value = item.depreciationExpensesByMonth ? item.depreciationExpensesByMonth[budgetMonth] : undefined;
                                  // If value exists and is a valid number, show it; otherwise show 0.00
                                  if (value !== undefined && value !== null && !isNaN(Number(value))) {
                                    return Number(value).toFixed(2);
                                  }
                                  // Show 0.00 instead of blank for missing or invalid values
                                  return '0.00';
                                }
                              };
                            })
                          ]
                        : [
                            // Add Accumulated Depreciation column for export when year and month are selected
                            ...(currentFilters.year && currentFilters.month ? [
                              { header: `Accumulated Depreciation (${currentFilters.month}/${currentFilters.year})`, key: 'accumulatedDepreciation' }
                            ] : [])
                          ]
                      )
                    ]}
                    title="Detailed Asset List"
                    type="detailed"
                    filterSummary={getFilterDisplayText()}
                  />
                </div>
              </div>
              {safeDetailedAssets.length > 0 ? (
                <PaginatedTable
                  data={safeDetailedAssets}
                  defaultItemsPerPage={25}
                  searchPlaceholder="Search assets by name, serial number, department..."
                  loading={loading || refreshing}
                  // Pagination removed - all filtered assets displayed
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
                        ? [
                            // Yearly Accumulated Depreciation column first
                            {
                              header: `Yearly Accumulated Depreciation (${currentFilters.year})`,
                              key: 'yearlyAccumulatedDepreciation',
                              render: (_: any, item: any) => {
                                if (!item.depreciationExpensesByMonth) return '$0.00';

                                // Calculate total for Ethiopian budget year (July to June)
                                let total = 0;
                                for (let i = 0; i < 12; i++) {
                                  const budgetMonth = ((i + 6) % 12) + 1; // July=7, Aug=8, ..., Dec=12, Jan=1, ..., June=6
                                  const monthValue = item.depreciationExpensesByMonth[budgetMonth];
                                  if (monthValue !== undefined && monthValue !== null && !isNaN(Number(monthValue))) {
                                    total += Number(monthValue);
                                  }
                                }

                                // Always show the total, even if it's 0
                                return `$${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                              },
                            },
                            // Book Value column - calculated as previous year's book value minus current year's accumulated depreciation
                            {
                              header: `Book Value (${currentFilters.year})`,
                              key: 'bookValueForYear',
                              render: (_: any, item: any) => {
                                // Use the API-calculated book value instead of manual calculation
                                // This ensures the same precision as the depreciation schedule
                                const apiBookValue = item.bookValue;

                                if (apiBookValue !== undefined && apiBookValue !== null && !isNaN(Number(apiBookValue))) {
                                  return `$${Number(apiBookValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`;
                                }

                                // Fallback to manual calculation if API book value not available
                                try {
                                  const unitPrice = item.unitPrice || 0;
                                  const residualPercentage = item.residualPercentage || 0;
                                  const salvageValue = unitPrice * (residualPercentage / 100);

                                  // Parse the budget year (e.g., "2023/2024" -> 2023)
                                  let startYear = parseInt(currentFilters.year || '0');
                                  if (currentFilters.year && currentFilters.year.includes('/')) {
                                    startYear = parseInt(currentFilters.year.split('/')[0]);
                                  }

                                  // Calculate total accumulated depreciation up to the end of current budget year using precise calculation
                                  let totalAccumulatedDepreciation = 0;

                                  if (item.sivDate) {
                                    try {
                                      // Use the same precise calculation as depreciation schedule
                                      const { calculateMonthlyDepreciation } = require('@/utils/depreciation');

                                      const depreciationInput = {
                                        unitPrice: unitPrice,
                                        sivDate: new Date(item.sivDate).toISOString().split('T')[0],
                                        usefulLifeYears: item.usefulLifeYears || 5,
                                        salvageValue: salvageValue,
                                        method: item.depreciationMethod || 'STRAIGHT_LINE',
                                      };

                                      const monthlyResults = calculateMonthlyDepreciation(depreciationInput);

                                      // Find the last month of the current budget year (June of next year)
                                      const endOfBudgetYear = { year: startYear + 1, month: 6 };

                                      // Find the result for that month to get precise accumulated depreciation
                                      const endResult = monthlyResults.find(result =>
                                        result.year === endOfBudgetYear.year && result.month === endOfBudgetYear.month
                                      );

                                      if (endResult) {
                                        totalAccumulatedDepreciation = endResult.accumulatedDepreciation;
                                      }
                                    } catch (error) {
                                      console.error('Error calculating precise accumulated depreciation:', error);
                                      // Fallback to old method if calculation fails
                                      if (item.depreciationExpensesByMonth) {
                                        const sivDate = new Date(item.sivDate);
                                        const sivYear = sivDate.getFullYear();
                                        const sivMonth = sivDate.getMonth() + 1;

                                        for (let year = sivYear; year <= startYear + 1; year++) {
                                          for (let month = 1; month <= 12; month++) {
                                            if (year === sivYear && month < sivMonth) continue;
                                            if (year === startYear + 1 && month > 6) break;
                                            if (year > startYear + 1) break;

                                            const monthValue = item.depreciationExpensesByMonth[month];
                                            if (monthValue !== undefined && monthValue !== null && !isNaN(Number(monthValue))) {
                                              totalAccumulatedDepreciation += Number(monthValue);
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }

                                  // Book Value = Depreciable Amount - Total Accumulated Depreciation, but never below 0
                                  const depreciableAmount = unitPrice - salvageValue;
                                  const bookValue = Math.max(depreciableAmount - totalAccumulatedDepreciation, 0);

                                  return `$${bookValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`; // Increased precision

                                } catch (error) {
                                  console.error('Error calculating book value:', error);
                                  return '$0.00';
                                }
                              }
                            },
                            // Monthly columns after the yearly total
                            ...Array.from({ length: 12 }, (_, i) => {
                              // Ethiopian budget year starts from July (month 7)
                              const budgetMonth = ((i + 6) % 12) + 1; // July=7, Aug=8, ..., Dec=12, Jan=1, ..., June=6
                              // Parse budget year format (e.g., "2024/2025" or "2024")
                              let startYear = parseInt(currentFilters.year || '0');
                              if (currentFilters.year && currentFilters.year.includes('/')) {
                                startYear = parseInt(currentFilters.year.split('/')[0]);
                              }
                              const budgetYear = budgetMonth >= 7 ? startYear : startYear + 1;
                              const monthLabel = new Date(0, budgetMonth - 1).toLocaleString('default', { month: 'short' });
                              return {
                                header: `${monthLabel} ${budgetYear} Depreciation Expense`,
                                key: `depreciationExpenseMonth${budgetMonth}`,
                                render: (_: any, item: any) => {
                                  const value = item.depreciationExpensesByMonth ? item.depreciationExpensesByMonth[budgetMonth] : undefined;
                                  // If value exists and is a valid number, show it; otherwise show $0.00
                                  if (value !== undefined && value !== null && !isNaN(Number(value))) {
                                    return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                  }
                                  // Show $0.00 instead of — for missing or invalid values
                                  return '$0.00';
                                },
                              };
                            })
                          ]
                        : [
                            // Add Accumulated Depreciation column when year and month are selected
                            ...(currentFilters.year && currentFilters.month ? [{
                              header: `Accumulated Depreciation (${currentFilters.month}/${currentFilters.year})`,
                              key: 'accumulatedDepreciation',
                              render: (_: any, item: any) => {
                                const accDepreciation = item.accumulatedDepreciation;
                                return accDepreciation !== undefined && accDepreciation !== null
                                  ? `$${Number(accDepreciation).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                  : '—';
                              },
                            }] : [])
                          ]
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
          {/* {assetStats && (
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
          )} */}

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
                  {safeLinkedAssets.length} linked assets found
                </span>
                <TableExportDropdown
                  data={safeLinkedAssets.map((asset: LinkedAsset) => ({
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
            ) : safeLinkedAssets.length > 0 ? (
              <div className="overflow-x-auto">
                <RoleBasedTable
                  data={safeLinkedAssets}
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
