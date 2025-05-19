'use client';

import { useState, useEffect } from 'react';
import { RoleBasedTable } from '@/components/ui/RoleBasedTable';
import { RoleBasedChart } from '@/components/ui/RoleBasedChart';
import { RoleBasedStats } from '@/components/ui/RoleBasedStats';

import { useSession } from 'next-auth/react';

export default function MaintenanceReportsPage() {
  const { data: session, status } = useSession();
  if (status === 'loading') return null;
  if (!session || !session.user) return null;
  if (session.user.role === 'ADMIN') {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-semibold text-center text-red-600">Access Denied</h1>
        <p className="text-center">You do not have permission to view maintenance reports.</p>
      </div>
    );
  }
  const [loading, setLoading] = useState(true);
  const [maintenanceStats, setMaintenanceStats] = useState<any>(null);
  const [statusDistribution, setStatusDistribution] = useState<any[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<any[]>([]);
  const [topAssets, setTopAssets] = useState<any[]>([]);

  useEffect(() => {
    fetchMaintenanceReports();
  }, []);

  const fetchMaintenanceReports = async () => {
    try {
      const response = await fetch('/api/reports/maintenance');
      if (!response.ok) throw new Error('Failed to fetch maintenance reports');
      const data = await response.json();
      
      setMaintenanceStats(data.stats);
      setStatusDistribution(data.statusDistribution);
      setMonthlyTrends(data.monthlyTrends);
      setTopAssets(data.topAssets);
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
      <h1 className="text-2xl font-semibold mb-6">Maintenance Reports</h1>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <RoleBasedStats
          name="Total Requests"
          value={maintenanceStats?.totalRequests || 0}
          trend={maintenanceStats?.requestGrowth || 0}
          trendLabel="vs last month"
        />
        <RoleBasedStats
          name="Pending Requests"
          value={maintenanceStats?.pendingRequests || 0}
          variant="warning"
        />
        <RoleBasedStats
          name="Average Resolution Time"
          value={`${maintenanceStats?.avgResolutionDays || 0} days`}
        />
        <RoleBasedStats
          name="Completion Rate"
          value={`${maintenanceStats?.completionRate || 0}%`}
          variant="success"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Request Status Distribution</h2>
          <RoleBasedChart
            type="pie"
            data={statusDistribution}
            options={{
              labels: statusDistribution.map((item) => item.status),
              values: statusDistribution.map((item) => item.count),
            }}
          />
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Monthly Maintenance Trends</h2>
          <RoleBasedChart
            type="line"
            data={monthlyTrends}
            options={{
              xAxis: monthlyTrends.map((item) => item.month),
              series: [
                {
                  name: 'Requests',
                  data: monthlyTrends.map((item) => item.count),
                },
                {
                  name: 'Completed',
                  data: monthlyTrends.map((item) => item.completed),
                },
              ],
            }}
          />
        </div>
      </div>

      {/* Top Assets Requiring Maintenance */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Top Assets Requiring Maintenance</h2>
          <RoleBasedTable
            data={topAssets}
            columns={[
              {
                key: 'name',
                header: 'Asset',
              },
              {
                key: 'totalRequests',
                header: 'Total Requests',
              },
              {
                key: 'lastMaintenance',
                header: 'Last Maintenance',
                render: (value) =>
                  value
                    ? new Date(value as string).toLocaleDateString()
                    : 'Never',
              },
              {
                key: 'averageCost',
                header: 'Average Cost',
                render: (value) =>
                  value
                    ? `$${(value as number).toFixed(2)}`
                    : 'N/A',
              },
              {
                key: 'status',
                header: 'Status',
                render: (value) => (
                  <span
                    className={`px-2 py-1 rounded-full text-sm ${
                      value === 'Due'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {value}
                  </span>
                ),
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
