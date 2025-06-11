'use client';

import { useState, useEffect } from 'react';
import { RoleBasedTable } from '@/components/ui/RoleBasedTable';
import { RoleBasedChart } from '@/components/ui/RoleBasedChart';
import { RoleBasedStats } from '@/components/ui/RoleBasedStats';
import { generatePdf } from '@/lib/generatePdf';
import { Download } from 'lucide-react';
import { BackButton } from '@/components/ui/BackButton';
import type {
  AssetStats,
  AssetStatusData,
  AssetValueData,
  AssetCategoryData,
  Column,
  ChartType,
  RoleBasedStatsProps
} from '@/types/reports';
import type { Asset } from '@/types/asset';

import { useSession } from 'next-auth/react';

export default function AssetReportsPage() {
  const { data: session, status } = useSession();
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
  const [assetStats, setAssetStats] = useState<AssetStats | null>(null);
  const [assetsByCategory, setAssetsByCategory] = useState<AssetCategoryData[]>([]);
  const [depreciationData, setDepreciationData] = useState<AssetValueData[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<AssetStatusData[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchAssetReports();
  }, []);

  const fetchAssetReports = async () => {
    try {
      const response = await fetch('/api/reports/assets');
      if (!response.ok) throw new Error('Failed to fetch asset reports');
      const data = await response.json();
      
      setAssetStats(data.stats);
      setAssetsByCategory(data.byCategory);
      setDepreciationData(data.depreciation);
      setStatusDistribution(data.statusDistribution);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilterOptions = () => {
    return Array.from(new Set(assetsByCategory.map(item => item.category)));
  };

  const getFilteredData = () => {
    let filteredData = assetsByCategory;
    
    // First apply status filter if needed
    if (statusFilter !== 'all') {
      filteredData = filteredData.filter(item => item.status === statusFilter);
    }

    // Then apply category filter
    if (selectedFilter !== 'all') {
      filteredData = filteredData.filter(item => item.category === selectedFilter);
    }

    // Aggregate the filtered data
    const aggregatedData = new Map();
    
    filteredData.forEach(item => {
      const key = item.category;
      
      if (!aggregatedData.has(key)) {
        aggregatedData.set(key, {
          category: item.category,
          status: statusFilter !== 'all' ? statusFilter : 'all',
          count: 0,
          value: 0
        });
      }
      
      const existing = aggregatedData.get(key);
      existing.count += item.count;
      existing.value += item.value;
    });
    
    return Array.from(aggregatedData.values());
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
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Asset Reports</h1>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div>
          <label htmlFor="categoryFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 sr-only">Filter by Category</label>
          <select
            id="categoryFilter"
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="all">All Categories</option>
            {getFilterOptions().map((option, idx) => (
              <option key={option + '-' + idx} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 sr-only">Filter by Status</label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="all">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="UNDER_MAINTENANCE">Under Maintenance</option>
            <option value="TRANSFERRED">Transferred</option>
            <option value="DISPOSED">Disposed</option>
          </select>
        </div>

        <div>
          <button
            onClick={() => {
              setSelectedFilter('all');
              setStatusFilter('all');
            }}
            className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <RoleBasedStats
          name="Total Assets"
          value={assetStats?.totalAssets || 0}
          trend={assetStats?.assetGrowth || 0}
          trendLabel="vs last month"
          variant="default"
          className="bg-white dark:bg-gray-800"
        />
        <RoleBasedStats
          name="Total Value"
          value={new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
          }).format(assetStats?.totalValue || 0)}
          trend={Number(((assetStats?.valueGrowth || 0) / (assetStats?.totalValue || 1) * 100).toFixed(1))}
          trendLabel="vs last month"
          variant="success"
          className="bg-white dark:bg-gray-800"
        />
        <RoleBasedStats
          name="Asset Utilization"
          value={assetStats?.activeAssets || 0}
          description={`${((assetStats?.activeAssets || 0) / (assetStats?.totalAssets || 1) * 100).toFixed(1)}% Active`}
          variant="default"
          className="bg-white dark:bg-gray-800"
        />
        <RoleBasedStats
          name="Maintenance Cost"
          value={new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
          }).format(assetStats?.maintenanceCost || 0)}
          variant="warning"
          className="bg-white dark:bg-gray-800"
        />
      </div>

      {/* Asset Distribution Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Assets by Category Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {selectedFilter === 'all' 
                ? `Assets by Category`
                : `Assets in ${selectedFilter}`}
              {statusFilter !== 'all' && ` (${statusFilter})`}
            </h2>
            {getFilteredData().length > 0 && (
              <button
                onClick={() => generatePdf({
                  title: `Assets by Category Report`,
                  data: getFilteredData(),
                  type: 'category'
                })}
                className="flex items-center gap-2 px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                <Download size={16} />
                Download PDF
              </button>
            )}
          </div>
          {getFilteredData().length > 0 ? (
            <RoleBasedChart
              type={selectedFilter === 'all' ? 'pie' : 'bar'}
              data={getFilteredData()}
              options={{
                labels: getFilteredData().map((item) => 
                  statusFilter !== 'all' ? `${item.category} (${item.status})` : item.category
                ),
                values: getFilteredData().map((item) => item.count),
                customColors: ['#10B981', '#F59E0B', '#EF4444', '#6B7280', '#3B82F6', '#8B5CF6', '#EC4899']
              }}
            />
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400">No data available</div>
          )}
        </div>

        {/* Status Distribution */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Asset Status Distribution</h2>
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
                customColors: ['#10B981', '#F59E0B', '#EF4444', '#6B7280', '#3B82F6', '#8B5CF6', '#EC4899']
              }}
            />
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400">No data available</div>
          )}
        </div>
      </div>

      {/* Depreciation Trend */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Asset Value & Depreciation Trend</h2>
        {depreciationData.length > 0 ? (
          <RoleBasedChart
            type="line"
            data={depreciationData}
            options={{
              xAxis: depreciationData.map((item) => item.month),
              series: [
                {
                  name: 'Book Value',
                  data: depreciationData.map((item) => item.value),
                },
                {
                  name: 'Depreciation',
                  data: depreciationData.map((item) => item.depreciation),
                },
              ],
            }}
          />
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-400">No data available</div>
        )}
      </div>

      {/* Asset Value Table */}
      <div className="bg-white rounded-lg shadow dark:bg-gray-900">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">
              {selectedFilter === 'all'
                ? `Asset Value Details by Category`
                : `Asset Value Details for ${selectedFilter}`}
              {statusFilter !== 'all' && ` (${statusFilter})`}
            </h2>
            <button
              onClick={() => generatePdf({
                title: `Asset Value Details by Category`,
                data: getFilteredData(),
                type: 'category'
              })}
              className="flex items-center gap-2 px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              <Download size={16} />
              Download PDF
            </button>
          </div>
          {getFilteredData().length > 0 ? (
            <RoleBasedTable
              data={getFilteredData()}
              columns={[
                {
                  header: 'Category',
                  key: 'category',
                  render: (value, item) => item.category,
                },
                {
                  header: 'Status',
                  key: 'status',
                  render: (value, item) => item.status,
                },
                {
                  header: 'Total Assets',
                  key: 'count',
                  render: (value, item) => item.count,
                },
                {
                  header: 'Total Value',
                  key: 'totalValue',
                  render: (value, item) => `$${Number(item.value).toFixed(2)}`,
                },
                {
                  header: 'Average Value',
                  key: 'averageValue',
                  render: (value, item) => `$${(Number(item.value) / Number(item.count)).toFixed(2)}`,
                },
              ]}
              className="bg-white dark:bg-gray-800"
            />
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400">No data available</div>
          )}
        </div>
      </div>
    </div>
  );
}
