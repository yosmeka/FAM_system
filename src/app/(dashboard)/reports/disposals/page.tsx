'use client';

import { useState, useEffect } from 'react';
import { RoleBasedTable } from '@/components/ui/RoleBasedTable';
import { RoleBasedChart } from '@/components/ui/RoleBasedChart';
import { RoleBasedStats } from '@/components/ui/RoleBasedStats';
import { Download, Settings, ChevronDown } from 'lucide-react';
import { BackButton } from '@/components/ui/BackButton';
import type {
  DisposalStats,
  DisposalMethodData,
  Column,
} from '@/types/reports';

import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';

interface DisposedAsset {
  id: string;
  assetName: string;
  serialNumber: string;
  category: string;
  purchasePrice: number;
  purchaseDate: string;
  disposalDate: string;
  method: string;
  status: 'APPROVED' | 'REJECTED';
  actualValue: number | null;
  expectedValue: number;
  requesterName: string;
  requesterEmail: string;
}

export default function DisposalReportsPage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disposalStats, setDisposalStats] = useState<DisposalStats | null>(null);
  const [methodDistribution, setMethodDistribution] = useState<DisposalMethodData[]>([]);
  const [disposedAssets, setDisposedAssets] = useState<DisposedAsset[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'APPROVED' | 'REJECTED'>('ALL');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Show nothing until session is loaded
  if (status === 'loading') return null;

  // If not allowed, show access denied
  if (session?.user?.role === 'AUDITOR') {
    return (
      <div className="flex items-center justify-center min-h-screen dark:bg-gray-900">
        <div className="bg-gray-100 dark:bg-gray-800 p-8 rounded shadow text-center">
          <h1 className="text-2xl font-bold mb-2 text-red-600 dark:text-red-400">Access Denied</h1>
          <p className="text-gray-700 dark:text-gray-300">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDisposalReports(true);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchDisposalReports();
  }, []);

  const fetchDisposalReports = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await fetch('/api/reports/disposals');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch disposal reports');
      }
      const data = await response.json();
      
      if (!data || !data.stats || !data.methodDistribution || !data.statusDistribution) {
        throw new Error('Invalid data format received from server');
      }
      
      setDisposalStats(data.stats);
      setMethodDistribution(data.methodDistribution);
      setDisposedAssets(data.disposedAssets || []);

      if (isRefresh) {
        toast.success('Report data refreshed');
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch disposal reports';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (!session || !session.user) return null;
  if (session.user.role === 'ADMIN') {
    return (
      <div className="container mx-auto p-6 dark:bg-gray-900">
        <h1 className="text-2xl font-semibold text-center text-red-600 dark:text-red-400">Access Denied</h1>
        <p className="text-center text-gray-700 dark:text-gray-300">You do not have permission to view disposal reports.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500 dark:border-red-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 dark:bg-gray-900">
        <div className="bg-red-50 dark:bg-red-800 border border-red-200 dark:border-red-400 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800 dark:text-red-400 mb-2">Error Loading Reports</h2>
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => fetchDisposalReports()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const filteredDisposedAssets = disposedAssets.filter(asset => {
    const disposalDate = new Date(asset.disposalDate);
    const isInDateRange = (!startDate || disposalDate >= new Date(startDate)) &&
                         (!endDate || disposalDate <= new Date(endDate));
    
    return (statusFilter === 'ALL' || asset.status === statusFilter) &&
           (methodFilter === 'ALL' || asset.method === methodFilter) &&
           isInDateRange;
  });

  // Calculate charts data from filtered assets
  const filteredStatusDistribution = [
    {
      status: 'APPROVED',
      count: filteredDisposedAssets.filter(asset => asset.status === 'APPROVED').length
    },
    {
      status: 'REJECTED',
      count: filteredDisposedAssets.filter(asset => asset.status === 'REJECTED').length
    }
  ];

  // Calculate method distribution
  const methodCounts = filteredDisposedAssets.reduce((acc: Record<string, number>, asset) => {
    acc[asset.method] = (acc[asset.method] || 0) + 1;
    return acc;
  }, {});

  // Convert to array format for the chart with category labels
  const filteredMethodDistribution = Object.entries(methodCounts).map(([method, count]) => ({
    category: method,
    count: count
  }));

  // Ensure SCRAP is in the method distribution if it exists in the data
  if (filteredDisposedAssets.some(asset => asset.method === 'SCRAP')) {
    const scrapExists = filteredMethodDistribution.some(item => item.category === 'SCRAP');
    if (!scrapExists) {
      filteredMethodDistribution.push({ category: 'SCRAP', count: 0 });
    }
  }

  console.log('Filtered Method Distribution Data:', filteredMethodDistribution);

  const disposedAssetsColumns: Column<DisposedAsset>[] = [
    {
      key: 'assetName',
      header: 'Asset Name',
    },
    {
      key: 'serialNumber',
      header: 'Serial Number',
    },
    {
      key: 'category',
      header: 'Category',
    },
    {
      key: 'purchasePrice',
      header: 'Purchase Price',
      render: (value) => `$${Number(value).toFixed(2)}`,
    },
    {
      key: 'disposalDate',
      header: 'Disposal Date',
      render: (value: string | number | null) => {
        if (!value) return '-';
        return new Date(value).toLocaleDateString();
      },
    },
    {
      key: 'method',
      header: 'Method',
    },
    {
      key: 'status',
      header: 'Status',
      render: (value) => (
        <span
          className={`px-2 py-1 rounded-full text-sm ${
            value === 'APPROVED'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {value}
        </span>
      ),
    },
    {
      key: 'requesterName',
      header: 'Requested By',
    },
  ];

  const exportToPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(16);
      doc.text('Asset Disposal Report', 14, 15);
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

      // Add table
      const tableColumn = disposedAssetsColumns.map(col => col.header);
      const tableRows = filteredDisposedAssets.map(asset => [
        asset.assetName,
        asset.serialNumber,
        asset.category,
        `$${Number(asset.purchasePrice).toFixed(2)}`,
        new Date(asset.disposalDate).toLocaleDateString(),
        asset.method,
        asset.status,
        asset.requesterName
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 30,
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

      doc.save(`disposal-report-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast.error('Failed to export PDF');
    }
  };

  const exportToExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      
      const worksheet = XLSX.utils.json_to_sheet(
        filteredDisposedAssets.map(asset => ({
          'Asset Name': asset.assetName,
          'Serial Number': asset.serialNumber,
          'Category': asset.category,
          'Purchase Price': `$${Number(asset.purchasePrice).toFixed(2)}`,
          'Disposal Date': new Date(asset.disposalDate).toLocaleDateString(),
          'Method': asset.method,
          'Status': asset.status,
          'Requested By': asset.requesterName
        }))
      );
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Disposal Report');
      XLSX.writeFile(workbook, `disposal-report-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Failed to export Excel file');
    }
  };

  const exportToCSV = () => {
    const headers = disposedAssetsColumns.map(col => col.header).join(',');
    const rows = filteredDisposedAssets.map(asset => [
      asset.assetName,
      asset.serialNumber,
      asset.category,
      `$${Number(asset.purchasePrice).toFixed(2)}`,
      new Date(asset.disposalDate).toLocaleDateString(),
      asset.method,
      asset.status,
      asset.requesterName
    ].join(','));
    
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `disposal-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <BackButton href="/reports" className='text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300' />
          <h1 className="text-2xl font-semibold">Disposal Reports</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchDisposalReports(true)}
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

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <RoleBasedStats
          name="Total Disposal Requests"
          value={disposalStats?.totalDisposals || 0}
          variant="default"
        />
        <RoleBasedStats
          name="Approved"
          value={disposalStats?.approvedDisposals || 0}
          variant="success"
        />
        <RoleBasedStats
          name="Rejected"
          value={disposalStats?.rejectedDisposals || 0}
          variant="danger"
        />
        <RoleBasedStats
          name="Pending Approval"
          value={disposalStats?.pendingDisposals || 0}
          variant="warning"
        />
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow mb-8 dark:bg-gray-900">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Filter Disposals</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Settings size={16} className="text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'APPROVED' | 'REJECTED')}
                className="w-full border rounded-md px-3 py-1.5 text-sm dark:bg-gray-900"
              >
                <option value="ALL">All Status</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="w-full border rounded-md px-3 py-1.5 text-sm dark:bg-gray-900"
              >
                <option value="ALL">All Methods</option>
                {methodDistribution.map((method) => (
                  <option key={method.method} value={method.method}>
                    {method.method}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border rounded-md px-3 py-1.5 text-sm dark:bg-gray-900"
                placeholder="Start Date"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border rounded-md px-3 py-1.5 text-sm dark:bg-gray-900"
                placeholder="End Date"
              />
              {(statusFilter!=='ALL'||methodFilter !=='ALL'|| startDate || endDate) && (
                <button
                  onClick={() => {
                    setStatusFilter('ALL')
                    setMethodFilter('ALL')
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 dark:bg-gray-900">
        <div className="bg-white p-6 rounded-lg shadow dark:bg-gray-900">
          <h2 className="text-lg font-semibold mb-4 ">Approval Status Distribution</h2>
          <RoleBasedChart
            type="pie"
            data={filteredStatusDistribution}
            options={{
              customColors: ['#22c55e', '#ef4444']
            }}
          />
        </div>
        <div className="bg-white p-6 rounded-lg shadow dark:bg-gray-900">
          <h2 className="text-lg font-semibold mb-4">Disposal Methods Distribution</h2>
          <RoleBasedChart
            type="pie"
            data={filteredMethodDistribution}
            options={{
              customColors: ['#22c55e', '#f59e0b', '#ef4444', '#9ca3af', '#3b82f6']
            }}
          />
        </div>
      </div>

      {/* Disposed Assets Table */}
      <div className="bg-white p-6 rounded-lg shadow mb-8 dark:bg-gray-900">
        <div className="flex justify-between items-center mb-4 dark:bg-gray-900">
          <h2 className="text-lg font-semibold">Asset Disposal Table</h2>
        </div>
        <RoleBasedTable
          data={filteredDisposedAssets}
          columns={disposedAssetsColumns}
        />
      </div>

      {/* Report Footer */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>Report generated on {new Date().toLocaleString()}</p>
        <p>Data refreshes automatically every 5 minutes</p>
      </div>
    </div>
  );
}
