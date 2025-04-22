'use client';

import { useState, useEffect } from 'react';
import { RoleBasedTable } from '@/components/ui/RoleBasedTable';
import { RoleBasedChart } from '@/components/ui/RoleBasedChart';
import { RoleBasedStats } from '@/components/ui/RoleBasedStats';
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

export default function AssetReportsPage() {
  const [loading, setLoading] = useState(true);
  const [assetStats, setAssetStats] = useState<AssetStats | null>(null);
  const [assetsByCategory, setAssetsByCategory] = useState<AssetCategoryData[]>([]);
  const [assetsByDepartment, setAssetsByDepartment] = useState<AssetCategoryData[]>([]);
  const [depreciationData, setDepreciationData] = useState<AssetValueData[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<AssetStatusData[]>([]);

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
      setAssetsByDepartment(data.byDepartment);
      setDepreciationData(data.depreciation);
      setStatusDistribution(data.statusDistribution);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">Asset Reports</h1>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <RoleBasedStats
          name="Total Assets"
          value={assetStats?.totalAssets || 0}
          trend={assetStats?.assetGrowth || 0}
          trendLabel="vs last month"
          variant="default"
        />
        <RoleBasedStats
          name="Total Value"
          value={`$${assetStats?.totalValue?.toLocaleString() || 0}`}
          trend={assetStats?.valueGrowth || 0}
          trendLabel="vs last month"
          variant="success"
        />
        <RoleBasedStats
          name="Asset Utilization"
          value={assetStats?.activeAssets || 0}
          description={`${((assetStats?.activeAssets || 0) / (assetStats?.totalAssets || 1) * 100).toFixed(1)}% Active`}
          variant="default"
        />
        <RoleBasedStats
          name="Maintenance Cost"
          value={assetStats?.maintenanceCost || 0}
          variant="warning"
        />
      </div>

      {/* Asset Distribution Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Assets by Category</h2>
          <RoleBasedChart
            type="pie"
            data={assetsByCategory}
            options={{
              labels: assetsByCategory.map((item) => item.category),
              values: assetsByCategory.map((item) => item.count),
            }}
          />
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Assets by Department</h2>
          <RoleBasedChart
            type="bar"
            data={assetsByDepartment}
            options={{
              xAxis: assetsByDepartment.map((item) => item.category),
              yAxis: assetsByDepartment.map((item) => item.value),
            }}
          />
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Asset Status Distribution</h2>
          <RoleBasedChart
            type="pie"
            data={statusDistribution}
            options={{
              labels: statusDistribution.map((item) => item.status),
              values: statusDistribution.map((item) => item.count),
            }}
          />
        </div>
      </div>

      {/* Depreciation Trend */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-lg font-semibold mb-4">Asset Value & Depreciation Trend</h2>
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
                data: depreciationData.map((item) => item.value),
              },
            ],
          }}
        />
        <RoleBasedStats
          name="Depreciation"
          value={assetStats?.totalDepreciation || 0}
          description="Total depreciation this year"
          variant="default"
        />
      </div>

      {/* Asset Value Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Asset Value Details</h2>
          <RoleBasedTable
            data={assetsByCategory}
            columns={[
              {
                header: 'Category',
                accessorKey: 'category',
              },
              {
                header: 'Total Assets',
                accessorKey: 'count',
              },
              {
                header: 'Total Value',
                accessorKey: 'value',
                cell: ({ row }: { row: { original: AssetCategoryData } }) => 
                  `$${row.original.value.toFixed(2)}`,
              },
              {
                header: 'Average Value',
                accessorKey: 'value',
                cell: ({ row }: { row: { original: AssetCategoryData } }) => 
                  `$${(row.original.value / row.original.count).toFixed(2)}`,
              },
            ].map((col, index) => ({ ...col, key: col.accessorKey })) as Column<AssetCategoryData>[]}
          />
        </div>
      </div>
    </div>
  );
}
