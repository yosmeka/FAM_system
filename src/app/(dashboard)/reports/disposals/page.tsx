'use client';

import { useState, useEffect, useRef } from 'react';
import { RoleBasedTable } from '@/components/ui/RoleBasedTable';
import { RoleBasedChart } from '@/components/ui/RoleBasedChart';
import { RoleBasedStats } from '@/components/ui/RoleBasedStats';
import { usePDF } from 'react-to-pdf';
import { Download, Settings } from 'lucide-react';
import { BackButton } from '@/components/ui/BackButton';
import type {
  DisposalStats,
  DisposalMethodData,
  DisposalTrendData,
  ValueRecoveryData,
  Column,
  ChartType,
  RoleBasedStatsProps
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
  const { toPDF, targetRef } = usePDF({
    filename: `disposal-report-${new Date().toISOString().split('T')[0]}.pdf`,
  });
  const { toPDF: toPDFTable, targetRef: tableTargetRef } = usePDF({
    filename: `disposal-assets-table-${new Date().toISOString().split('T')[0]}.pdf`,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disposalStats, setDisposalStats] = useState<DisposalStats | null>(null);
  const [methodDistribution, setMethodDistribution] = useState<DisposalMethodData[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<DisposalTrendData[]>([]);
  const [valueRecovery, setValueRecovery] = useState<ValueRecoveryData[]>([]);
  const [disposedAssets, setDisposedAssets] = useState<DisposedAsset[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'APPROVED' | 'REJECTED'>('ALL');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [statusDistribution, setStatusDistribution] = useState<{ status: string; count: number }[]>([]);

  // Show nothing until session is loaded
  if (status === 'loading') return null;

  // If not allowed, show access denied
  if (session?.user?.role === 'AUDITOR') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="bg-white p-8 rounded shadow text-center">
          <h1 className="text-2xl font-bold mb-2 text-red-600">Access Denied</h1>
          <p className="text-gray-700">You do not have permission to view this page.</p>
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
      setStatusDistribution(data.statusDistribution);
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
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-semibold text-center text-red-600">Access Denied</h1>
        <p className="text-center">You do not have permission to view disposal reports.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Reports</h2>
          <p className="text-red-600">{error}</p>
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

  const filteredDisposedAssets = disposedAssets.filter(asset => 
    (statusFilter === 'ALL' || asset.status === statusFilter) &&
    (methodFilter === 'ALL' || asset.method === methodFilter)
  );

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

  return (
    <div className="container mx-auto p-6" ref={targetRef}>
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
          <button
            onClick={() => toPDF()}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            <Download size={16} />
            Export PDF
          </button>
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
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Filter Disposals</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Settings size={16} className="text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'APPROVED' | 'REJECTED')}
                className="border rounded-md px-3 py-1.5 text-sm dark:bg-gray-900"
              >
                <option value="ALL">All Status</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="border rounded-md px-3 py-1.5 text-sm dark:bg-gray-900"
              >
                <option value="ALL">All Methods</option>
                {methodDistribution.map((method) => (
                  <option key={method.method} value={method.method}>
                    {method.method}
                  </option>
                ))}
              </select>
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
      <div className="bg-white p-6 rounded-lg shadow mb-8 dark:bg-gray-900" ref={tableTargetRef}>
        <div className="flex justify-between items-center mb-4 dark:bg-gray-900">
          <h2 className="text-lg font-semibold">Asset Disposal Table</h2>
          <button
            onClick={() => toPDFTable()}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
          >
            <Download size={16} />
            Export Table PDF
          </button>
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
