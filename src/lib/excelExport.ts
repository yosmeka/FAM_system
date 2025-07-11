'use client';

// Note: XLSX import will be dynamic to avoid SSR issues

export interface ExcelExportData {
  stats: {
    totalAssets: number;
    activeAssets: number;
    totalValue: number;
    totalPurchaseValue: number;
    maintenanceCost: number;
    assetGrowth: number;
    valueGrowth: number;
    totalDepreciation: number;
    averageAssetAge: number;
    utilizationRate: number;
    totalROI: number;
  };
  byCategory: Array<{
    category: string;
    status: string;
    count: number;
    value: number;
  }>;
  byDepartment: Array<{
    category: string;
    status: string;
    count: number;
    value: number;
  }>;
  byCurrentDepartment?: Array<{
    category: string;
    status: string;
    count: number;
    value: number;
  }>;
  statusDistribution: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  depreciation: Array<{
    month: string;
    value: number;
    depreciation: number;
  }>;
  assets?: Array<{
    id: string;
    name: string;
    serialNumber: string;
    category: string;
    status: string;
    location: string;
    department: string;
    purchaseDate: string;
    purchasePrice: number;
    currentValue: number;
    depreciationMethod: string;
    supplier: string;
    warrantyExpiry: string | null;
    usefulLifeYears: number | null;
    age: number;
    depreciationRate: string;
  }>;
  analytics: {
    depreciationTrend: number;
    averageDepreciationRate: number;
    assetTurnover: number;
  };
}

export async function exportToExcel(data: ExcelExportData, filename: string = 'asset-report') {
  try {
    // Dynamic import to avoid SSR issues
    const XLSX = await import('xlsx');

    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Summary Statistics Sheet
    const summaryData = [
      ['Asset Report Summary', '', '', ''],
      ['Generated on:', new Date().toLocaleDateString(), '', ''],
      ['', '', '', ''],
      ['Metric', 'Value', 'Unit', 'Description'],
      ['Total Assets', data.stats.totalAssets, 'count', 'Total number of assets'],
      ['Active Assets', data.stats.activeAssets, 'count', 'Number of active assets'],
      ['Total Current Value', data.stats.totalValue, 'USD', 'Current market value of all assets'],
      ['Total Purchase Value', data.stats.totalPurchaseValue, 'USD', 'Original purchase value of all assets'],
      ['Total Depreciation', data.stats.totalDepreciation, 'USD', 'Total accumulated depreciation'],
      ['Maintenance Cost', data.stats.maintenanceCost, 'USD', 'Total maintenance expenses'],
      ['Asset Growth', data.stats.assetGrowth, 'count', 'Asset count change vs last year'],
      ['Value Growth', data.stats.valueGrowth, 'USD', 'Value change vs last year'],
      ['Average Asset Age', data.stats.averageAssetAge, 'years', 'Average age of assets'],
      ['Utilization Rate', data.stats.utilizationRate, '%', 'Percentage of active assets'],
      ['Total ROI', data.stats.totalROI, '%', 'Return on investment'],
      ['', '', '', ''],
      ['Advanced Analytics', '', '', ''],
      ['Depreciation Trend', data.analytics.depreciationTrend, 'USD', 'Depreciation trend over time'],
      ['Average Depreciation Rate', data.analytics.averageDepreciationRate, '%', 'Average depreciation rate'],
      ['Asset Turnover', data.analytics.assetTurnover, 'ratio', 'Asset turnover ratio']
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    
    // Set column widths
    summarySheet['!cols'] = [
      { width: 25 },
      { width: 15 },
      { width: 10 },
      { width: 30 }
    ];

    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Assets by Category Sheet
    const categoryData = [
      ['Assets by Category', '', '', ''],
      ['Category', 'Status', 'Count', 'Total Value (USD)'],
      ...data.byCategory.map(item => [
        item.category,
        item.status,
        item.count,
        item.value
      ])
    ];

    const categorySheet = XLSX.utils.aoa_to_sheet(categoryData);
    categorySheet['!cols'] = [
      { width: 20 },
      { width: 15 },
      { width: 10 },
      { width: 15 }
    ];

    XLSX.utils.book_append_sheet(workbook, categorySheet, 'By Category');

    // Assets by Department Sheet
    const departmentData = [
      ['Assets by Current Department', '', '', ''],
      ['Current Department', 'Status', 'Count', 'Total Value (USD)'],
      ...((data.byCurrentDepartment && data.byCurrentDepartment.length > 0 ? data.byCurrentDepartment : data.byDepartment).map(item => [
        item.category,
        item.status,
        item.count,
        item.value
      ]))
    ];

    const departmentSheet = XLSX.utils.aoa_to_sheet(departmentData);
    departmentSheet['!cols'] = [
      { width: 20 },
      { width: 15 },
      { width: 10 },
      { width: 15 }
    ];

    XLSX.utils.book_append_sheet(workbook, departmentSheet, 'By Current Department');

    // Status Distribution Sheet
    const statusData = [
      ['Asset Status Distribution', '', ''],
      ['Status', 'Count', 'Percentage (%)'],
      ...data.statusDistribution.map(item => [
        item.status,
        item.count,
        item.percentage
      ])
    ];

    const statusSheet = XLSX.utils.aoa_to_sheet(statusData);
    statusSheet['!cols'] = [
      { width: 15 },
      { width: 10 },
      { width: 15 }
    ];

    XLSX.utils.book_append_sheet(workbook, statusSheet, 'Status Distribution');

    // Depreciation Trend Sheet
    const depreciationData = [
      ['Depreciation Trend Analysis', '', ''],
      ['Month', 'Book Value (USD)', 'Depreciation (USD)'],
      ...data.depreciation.map(item => [
        item.month,
        item.value,
        item.depreciation
      ])
    ];

    const depreciationSheet = XLSX.utils.aoa_to_sheet(depreciationData);
    depreciationSheet['!cols'] = [
      { width: 15 },
      { width: 15 },
      { width: 15 }
    ];

    XLSX.utils.book_append_sheet(workbook, depreciationSheet, 'Depreciation Trend');

    // Detailed Assets Sheet (if available)
    if (data.assets && data.assets.length > 0) {
      const assetsData = [
        ['Detailed Asset List', '', '', '', '', '', '', '', '', ''],
        ['Asset Name', 'Serial Number', 'Category', 'Status', 'Location', 'Purchase Date', 'Purchase Price (USD)', 'Current Value (USD)', 'Age (Years)', 'Depreciation Rate (%)'],
        ...data.assets.map(asset => [
          asset.name,
          asset.serialNumber,
          asset.category,
          asset.status,
          asset.location,
          asset.purchaseDate,
          asset.purchasePrice,
          asset.currentValue,
          asset.age,
          asset.depreciationRate
        ])
      ];

      const assetsSheet = XLSX.utils.aoa_to_sheet(assetsData);
      assetsSheet['!cols'] = [
        { width: 25 }, // Asset Name
        { width: 15 }, // Serial Number
        { width: 15 }, // Category
        { width: 12 }, // Status
        { width: 15 }, // Location
        { width: 12 }, // Purchase Date
        { width: 15 }, // Purchase Price
        { width: 15 }, // Current Value
        { width: 10 }, // Age
        { width: 15 }  // Depreciation Rate
      ];

      XLSX.utils.book_append_sheet(workbook, assetsSheet, 'Detailed Assets');
    }

    // Generate and download the file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}-${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw new Error('Failed to export Excel file');
  }
}

export function exportToCSV(data: Record<string, unknown>[], filename: string = 'asset-data', headers: string[] = []) {
  try {
    // Convert data to CSV format
    const csvContent = [
      headers.length > 0 ? headers.join(',') : Object.keys(data[0] || {}).join(','),
      ...data.map(row => 
        (headers.length > 0 ? headers : Object.keys(row)).map(key => {
          const value = row[key];
          // Handle values that might contain commas or quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    throw new Error('Failed to export CSV file');
  }
}
