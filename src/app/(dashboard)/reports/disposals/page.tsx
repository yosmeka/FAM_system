'use client';

import { useState, useEffect } from 'react';
import { RoleBasedTable } from '@/components/ui/RoleBasedTable';
import { RoleBasedChart } from '@/components/ui/RoleBasedChart';
import { RoleBasedStats } from '@/components/ui/RoleBasedStats';
import type {
  DisposalStats,
  DisposalMethodData,
  DisposalTrendData,
  ValueRecoveryData,
  Column,
  ChartType,
  RoleBasedStatsProps
} from '@/types/reports';

export default function DisposalReportsPage() {
  const [loading, setLoading] = useState(true);
  const [disposalStats, setDisposalStats] = useState<DisposalStats | null>(null);
  const [methodDistribution, setMethodDistribution] = useState<DisposalMethodData[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<DisposalTrendData[]>([]);
  const [valueRecovery, setValueRecovery] = useState<ValueRecoveryData[]>([]);

  useEffect(() => {
    fetchDisposalReports();
  }, []);

  const fetchDisposalReports = async () => {
    try {
      const response = await fetch('/api/reports/disposals');
      if (!response.ok) throw new Error('Failed to fetch disposal reports');
      const data = await response.json();
      
      setDisposalStats(data.stats);
      setMethodDistribution(data.methodDistribution);
      setMonthlyTrends(data.monthlyTrends);
      setValueRecovery(data.valueRecovery);
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
      <h1 className="text-2xl font-semibold mb-6">Disposal Reports</h1>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <RoleBasedStats
          name="Total Disposals"
          value={disposalStats?.totalDisposals || 0}
          trend={disposalStats?.disposalGrowth || 0}
          trendLabel="vs last month"
          variant="default"
        />
        <RoleBasedStats
          name="Value Recovered"
          value={`$${disposalStats?.totalRecovered || 0}`}
          trend={disposalStats?.recoveryGrowth || 0}
          trendLabel="vs last month"
          variant="success"
        />
        <RoleBasedStats
          name="Recovery Rate"
          value={`${disposalStats?.recoveryRate || 0}%`}
          description="Of original value"
          variant="default"
        />
        <RoleBasedStats
          name="Pending Approvals"
          value={disposalStats?.pendingDisposals || 0}
          trend={disposalStats?.pendingGrowth || 0}
          trendLabel="vs last month"
          variant="warning"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Disposal Methods Distribution</h2>
          <RoleBasedChart
            type="pie"
            data={methodDistribution}
            options={{
              labels: methodDistribution.map((item) => item.method),
              values: methodDistribution.map((item) => item.count),
              colors: ['#22c55e', '#f59e0b', '#ef4444', '#9ca3af']
            }}
          />
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Monthly Disposal Trends</h2>
          <RoleBasedChart
            type="line"
            data={monthlyTrends}
            options={{
              xAxis: monthlyTrends.map((item) => item.month),
              series: [
                {
                  name: 'Disposals',
                  data: monthlyTrends.map((item) => item.count)
                }
              ]
            }}
          />
          <RoleBasedStats
            name="Total Value"
            value={disposalStats?.totalRecovered || 0}
            variant="success"
          />
        </div>
      </div>

      {/* Value Recovery Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Value Recovery Analysis</h2>
          <RoleBasedTable
            data={valueRecovery}
            columns={[
              {
                key: 'month',
                header: 'Month',
                render: (value) => String(value),
              },
              {
                key: 'expected',
                header: 'Expected Value',
                render: (value) => `$${Number(value).toFixed(2)}`,
              },
              {
                key: 'actual',
                header: 'Actual Value',
                render: (value) => `$${Number(value).toFixed(2)}`,
              },
              {
                key: 'rate',
                header: 'Recovery Rate',
                render: (value, item) => {
                  const actual = typeof item.actual === 'number' ? item.actual : Number(item.actual) || 0;
                  const expected = typeof item.expected === 'number' && item.expected !== 0 ? item.expected : Number(item.expected) || 1;
                  const rate = (expected !== 0 ? (actual / expected) * 100 : 0);
                  return (
                    <span
                      className={`px-2 py-1 rounded-full text-sm ${
                        rate >= 90
                          ? 'bg-green-100 text-green-800'
                          : rate >= 70
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {rate.toFixed(1)}%
                    </span>
                  );
                },
              },
            ]}

          />
        </div>
      </div>
    </div>
  );
}
