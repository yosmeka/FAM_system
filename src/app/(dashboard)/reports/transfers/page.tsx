'use client';

import { useState, useEffect } from 'react';
import { RoleBasedTable } from '@/components/ui/RoleBasedTable';
import { RoleBasedChart } from '@/components/ui/RoleBasedChart';
import { RoleBasedStats } from '@/components/ui/RoleBasedStats';

import { useSession } from 'next-auth/react';

export default function TransferReportsPage() {
  const { data: session, status } = useSession();
  if (status === 'loading') return null;
  if (!session || !session.user) return null;
  if (session.user.role === 'ADMIN') {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-semibold text-center text-red-600">Access Denied</h1>
        <p className="text-center">You do not have permission to view transfer reports.</p>
      </div>
    );
  }
  const [loading, setLoading] = useState(true);
  const [transferStats, setTransferStats] = useState<any>(null);
  const [locationTransfers, setLocationTransfers] = useState<any[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<any[]>([]);
  const [departmentTransfers, setDepartmentTransfers] = useState<any[]>([]);

  useEffect(() => {
    fetchTransferReports();
  }, []);

  const fetchTransferReports = async () => {
    try {
      const response = await fetch('/api/reports/transfers');
      if (!response.ok) throw new Error('Failed to fetch transfer reports');
      const data = await response.json();
      
      setTransferStats(data.stats);
      setLocationTransfers(data.locationTransfers);
      setMonthlyTrends(data.monthlyTrends);
      setDepartmentTransfers(data.departmentTransfers);
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
      <h1 className="text-2xl font-semibold mb-6">Transfer Reports</h1>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <RoleBasedStats
          name="Total Transfers"
          value={transferStats?.totalTransfers || 0}
          trend={transferStats?.transferGrowth || 0}
          trendLabel="vs last month"
        />
        <RoleBasedStats
          name="Pending Transfers"
          value={transferStats?.pendingTransfers || 0}
          variant="warning"
        />
        <RoleBasedStats
          name="Average Processing Time"
          value={`${transferStats?.avgProcessingDays || 0} days`}
        />
        <RoleBasedStats
          name="Approval Rate"
          value={`${transferStats?.approvalRate || 0}%`}
          variant="success"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Location Transfer Heat Map</h2>
          <RoleBasedChart
            type="heatmap"
            data={locationTransfers}
            options={{
              xAxis: locationTransfers.map((item) => item.fromLocation),
              yAxis: locationTransfers.map((item) => item.toLocation),
              values: locationTransfers.map((item) => item.count),
            }}
          />
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Monthly Transfer Trends</h2>
          <RoleBasedChart
            type="line"
            data={monthlyTrends}
            options={{
              xAxis: monthlyTrends.map((item) => item.month),
              series: [
                {
                  name: 'Transfers',
                  data: monthlyTrends.map((item) => item.count),
                },
                {
                  name: 'Approved',
                  data: monthlyTrends.map((item) => item.approved),
                },
              ],
            }}
          />
        </div>
      </div>

      {/* Department Transfer Matrix */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Department Transfer Summary</h2>
          <RoleBasedTable
            data={departmentTransfers}
            columns={[
              {
                key: 'department',
                header: 'Department',
              },
              {
                key: 'outgoing',
                header: 'Outgoing Transfers',
              },
              {
                key: 'incoming',
                header: 'Incoming Transfers',
              },
              {
                key: 'netChange',
                header: 'Net Change',
                render: (value, item) => {
                  const netChange = item.incoming - item.outgoing;
                  return (
                    <span
                      className={`${
                        netChange > 0
                          ? 'text-green-600'
                          : netChange < 0
                          ? 'text-red-600'
                          : 'text-gray-600'
                      }`}
                    >
                      {netChange > 0 ? '+' : ''}
                      {netChange}
                    </span>
                  );
                },
              },
              {
                key: 'avgProcessingDays',
                header: 'Average Processing Time',
                render: (value) => `${Math.round(value as number)} days`,
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
