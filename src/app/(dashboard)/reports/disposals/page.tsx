'use client';

import { useState, useEffect, useRef } from 'react';
import { RoleBasedTable } from '@/components/ui/RoleBasedTable';
import { RoleBasedChart } from '@/components/ui/RoleBasedChart';
import { RoleBasedStats } from '@/components/ui/RoleBasedStats';
import { usePDF } from 'react-to-pdf';
import { Download } from 'lucide-react';
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

export default function DisposalReportsPage() {
  const { data: session, status } = useSession();
  const { toPDF, targetRef } = usePDF({
    filename: `disposal-report-${new Date().toISOString().split('T')[0]}.pdf`,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [disposalStats, setDisposalStats] = useState<DisposalStats | null>(null);
  const [methodDistribution, setMethodDistribution] = useState<DisposalMethodData[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<DisposalTrendData[]>([]);
  const [valueRecovery, setValueRecovery] = useState<ValueRecoveryData[]>([]);

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

      const response = await fetch('/api/reports/disposals');
      if (!response.ok) throw new Error('Failed to fetch disposal reports');
      const data = await response.json();
      
      setDisposalStats(data.stats);
      setMethodDistribution(data.methodDistribution);
      setMonthlyTrends(data.monthlyTrends);
      setValueRecovery(data.valueRecovery);

      if (isRefresh) {
        toast.success('Report data refreshed');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to fetch disposal reports');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (status === 'loading') return null;
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

  return (
    <div className="container mx-auto p-6" ref={targetRef}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Disposal Reports</h1>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Disposal Methods Distribution</h2>
          <RoleBasedChart
            type="pie"
            data={{
              labels: methodDistribution.map((item) => item.method),
              datasets: [{
                data: methodDistribution.map((item) => item.count),
                backgroundColor: ['#22c55e', '#f59e0b', '#ef4444', '#9ca3af']
              }]
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
        </div>
      </div>

      {/* Value Recovery Table */}
      <div className="bg-white p-6 rounded-lg shadow">
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

      {/* Report Footer */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>Report generated on {new Date().toLocaleString()}</p>
        <p>Data refreshes automatically every 5 minutes</p>
      </div>
    </div>
  );
}
