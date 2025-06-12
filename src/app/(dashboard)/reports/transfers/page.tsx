'use client';

import { useState, useEffect, useCallback } from 'react';
import { RoleBasedTable } from '@/components/ui/RoleBasedTable';
import { RoleBasedChart } from '@/components/ui/RoleBasedChart';
import { RoleBasedStats } from '@/components/ui/RoleBasedStats';
import { PdfExportButton } from '@/components/PdfExportButton';
import { TransferReportData } from '@/utils/pdfUtils';
import { BackButton } from '@/components/ui/BackButton';

// Define interfaces for our data types
interface TransferStats {
  totalTransfers: number;
  pendingTransfers: number;
  inProgressTransfers: number;
  completedTransfers: number;
  rejectedTransfers: number;
  cancelledTransfers: number;
  avgProcessingDays: number;
  avgTimeToApprovalHours: number;
  approvalRate: number;
  rejectionRate: number;
  transferEfficiency: number;
  transferVelocity: number;
  transferGrowth: number;
}

interface MonthlyTrend {
  month: string;
  count: number;
  approved: number;
  rejected: number;
  approvalRate: number;
}

interface LocationTransfer {
  department: string;
  outgoing: number;
  incoming: number;
  avgProcessingDays: number;
  netChange?: number; // Virtual property for table display
  actions?: string;   // Virtual property for table display
}

interface StatusDistributionItem {
  status: string;
  count: number;
  percentage: number;
}

import { useSession } from 'next-auth/react';

// Helper function to format month string (YYYY-MM) to a more readable format
const formatMonth = (monthStr: string): string => {
  try {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  } catch (error) {
    console.error('Error formatting month:', error);
    return monthStr; // Return original string if there's an error
  }
};

export default function TransferReportsPage() {
  const { data: session, status } = useSession();

  // Define state variables outside of conditional rendering
  const [isLoading, setIsLoading] = useState(true);
  const [transferStats, setTransferStats] = useState<TransferStats | null>(null);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [locationTransfers, setLocationTransfers] = useState<LocationTransfer[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<StatusDistributionItem[]>([]);
  const [reportData, setReportData] = useState<TransferReportData | null>(null);

  const fetchTransferReports = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/reports/transfers');
      if (!response.ok) throw new Error('Failed to fetch transfer reports');
      const data = await response.json();

      setTransferStats(data.stats);
      // Set monthly trends data with debugging
      console.log('Monthly Trends Data:', data.monthlyTrends);
      setMonthlyTrends(data.monthlyTrends || []);
      setLocationTransfers(data.departmentTransfers); // API still returns as departmentTransfers
      // Set status distribution data with debugging
      console.log('Status Distribution Data:', data.statusDistribution);
      setStatusDistribution(data.statusDistribution || []);

      // Store complete report data for PDF export
      setReportData({
        stats: data.stats,
        departmentTransferMatrix: data.departmentTransferMatrix || [], // Keep the original key for PDF export
        monthlyTrends: data.monthlyTrends,
        departmentTransfers: data.departmentTransfers, // Keep the original key for PDF export
        statusDistribution: data.statusDistribution || [] // Include status distribution data
      });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);





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





  useEffect(() => {
    if (session && session.user && session.user.role !== 'ADMIN') {
      fetchTransferReports();
    }
  }, [session, fetchTransferReports]);

  //if (status === 'loading') return null;
  if (!session || !session.user) return null;
  if (session.user.role === 'ADMIN') {
    return (
      <div className="container mx-auto p-6 dark:bg-gray-900">
        <h1 className="text-2xl font-semibold text-center text-red-600 dark:text-red-400">Access Denied</h1>
        <p className="text-center text-gray-700 dark:text-gray-300">You do not have permission to view transfer reports.</p>
      </div>
    );
  }



  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 dark:bg-gray-900">
      <div className="flex justify-between items-center mb-8 p-4 rounded-lg shadow-sm dark:bg-gray-900">
        <div className="flex items-center dark:bg-gray-900">
        <BackButton href="/reports" className="text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300" />
          <div className="bg-indigo-100 p-3 rounded-full mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm2 10a1 1 0 10-2 0v3a1 1 0 102 0v-3zm2-3a1 1 0 011 1v5a1 1 0 11-2 0v-5a1 1 0 011-1zm4-1a1 1 0 10-2 0v7a1 1 0 102 0V8z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Transfer Reports</h1>
            <p className="text-gray-600 text-sm">Comprehensive analysis of asset transfers across departments</p>
          </div>
        </div>
        <div className="flex items-center dark:bg-gray-900">
          <div className="mr-4 text-right">
            <div className="text-sm text-gray-600">Report Period</div>
            <div className="font-medium">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
          </div>
          <PdfExportButton reportData={reportData} />
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="col-span-4">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-400">Transfer Summary</h2>
        </div>

        <RoleBasedStats
          name="Total Transfers"
          value={transferStats?.totalTransfers || 0}
          trend={transferStats?.transferGrowth || 0}
          trendLabel="vs last month"
          className="transform transition-all duration-300 hover:scale-105 hover:shadow-lg"
        />
        <RoleBasedStats
          name="Completed Transfers"
          value={transferStats?.completedTransfers || 0}
          variant="success"
          className="transform transition-all duration-300 hover:scale-105 hover:shadow-lg"
        />
        <RoleBasedStats
          name="Pending Transfers"
          value={transferStats?.pendingTransfers || 0}
          variant="warning"
          className="transform transition-all duration-300 hover:scale-105 hover:shadow-lg"
        />
        <RoleBasedStats
          name="Rejected Transfers"
          value={transferStats?.rejectedTransfers || 0}
          variant="danger"
          className="transform transition-all duration-300 hover:scale-105 hover:shadow-lg"
        />
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="col-span-4">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-400">Performance Metrics</h2>
        </div>

        <RoleBasedStats
          name="Approval Rate"
          value={`${transferStats?.approvalRate !== undefined ? transferStats.approvalRate : 0}%`}
          variant={transferStats && transferStats.approvalRate > 50 ? "success" : transferStats && transferStats.approvalRate > 30 ? "warning" : "danger"}
          className="transform transition-all duration-300 hover:scale-105 hover:shadow-lg"
        />
        <RoleBasedStats
          name="Rejection Rate"
          value={`${transferStats?.rejectionRate || 0}%`}
          variant={transferStats && transferStats.rejectionRate < 30 ? "success" : transferStats && transferStats.rejectionRate < 50 ? "warning" : "danger"}
          className="transform transition-all duration-300 hover:scale-105 hover:shadow-lg"
        />
        <RoleBasedStats
          name="Average Processing Time"
          value={`${transferStats?.avgProcessingDays || 0} days`}
          variant="info"
          className="transform transition-all duration-300 hover:scale-105 hover:shadow-lg"
        />
        <RoleBasedStats
          name="Transfer Efficiency"
          value={`${transferStats?.transferEfficiency || 0}%`}
          variant={transferStats && transferStats.transferEfficiency > 70 ? "success" : transferStats && transferStats.transferEfficiency > 40 ? "warning" : "danger"}
          className="transform transition-all duration-300 hover:scale-105 hover:shadow-lg"
        />
      </div>

      {/* Technical Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="col-span-4">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-400">Technical Metrics</h2>
        </div>

        <RoleBasedStats
          name="Avg. Time to Approval"
          value={`${transferStats?.avgTimeToApprovalHours || 0} hrs`}
          variant="info"
          className="transform transition-all duration-300 hover:scale-105 hover:shadow-lg"
        />
        <RoleBasedStats
          name="Transfer Velocity"
          value={`${transferStats?.transferVelocity || 0}/day`}
          variant="default"
          className="transform transition-all duration-300 hover:scale-105 hover:shadow-lg"
        />
        <RoleBasedStats
          name="Transfer Growth"
          value={`${transferStats?.transferGrowth || 0}%`}
          variant={transferStats && transferStats.transferGrowth > 0 ? "success" : "danger"}
          className="transform transition-all duration-300 hover:scale-105 hover:shadow-lg"
        />
        <RoleBasedStats
          name="In Progress"
          value={transferStats?.inProgressTransfers || 0}
          variant="warning"
          className="transform transition-all duration-300 hover:scale-105 hover:shadow-lg"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="col-span-2">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-400">Visualizations</h2>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 dark:bg-gray-900">
          <h2 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-500 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5zm9 4a1 1 0 10-2 0v6a1 1 0 102 0V7zm-3 2a1 1 0 10-2 0v4a1 1 0 102 0V9zm-3 3a1 1 0 10-2 0v1a1 1 0 102 0v-1z" clipRule="evenodd" />
            </svg>
            Location Transfer Summary
          </h2>
          <div className="border border-gray-100 rounded-lg p-2 bg-gray-50 dark:bg-gray-900">
            <RoleBasedChart
              type="bar"
              data={locationTransfers.map(loc => ({
                location: loc.department,
                outgoing: loc.outgoing,
                incoming: loc.incoming,
                netChange: loc.incoming - loc.outgoing
              }))}
              options={{
                xAxis: locationTransfers.map(loc => loc.department),
                series: [
                  {
                    name: 'Outgoing',
                    data: locationTransfers.map(loc => loc.outgoing),
                  },
                  {
                    name: 'Incoming',
                    data: locationTransfers.map(loc => loc.incoming),
                  },
                  {
                    name: 'Net Change',
                    data: locationTransfers.map(loc => loc.incoming - loc.outgoing),
                  }
                ],
              }}
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 dark:bg-gray-900">
          <h2 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-500 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
            Monthly Transfer Trends
          </h2>
          <div className="border border-gray-100 rounded-lg p-2 bg-gray-50 dark:bg-gray-900">
            {monthlyTrends && monthlyTrends.length > 0 ? (
              <>
                <div className="mb-4 grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-sm text-gray-500">Total Transfers</div>
                    <div className="text-xl font-bold text-blue-600">
                      {monthlyTrends.reduce((sum, item) => sum + item.count, 0)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-500">Approved</div>
                    <div className="text-xl font-bold text-green-600">
                      {monthlyTrends.reduce((sum, item) => sum + item.approved, 0)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-500">Rejected</div>
                    <div className="text-xl font-bold text-red-600">
                      {monthlyTrends.reduce((sum, item) => sum + (item.rejected || 0), 0)}
                    </div>
                  </div>
                </div>
                <div className="mb-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm mb-4">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-900">
                          <th className="p-2 text-left">Month</th>
                          <th className="p-2 text-right">Total</th>
                          <th className="p-2 text-right">Approved</th>
                          <th className="p-2 text-right">Rejected</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyTrends
                          .sort((a, b) => a.month.localeCompare(b.month))
                          .map((item, index) => (
                            <tr key={index} className={index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-900'}>
                              <td className="p-2 text-left">{formatMonth(item.month)}</td>
                              <td className="p-2 text-right">{item.count}</td>
                              <td className="p-2 text-right">{item.approved}</td>
                              <td className="p-2 text-right">{item.rejected || 0}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <RoleBasedChart
                  type="line"
                  data={monthlyTrends.sort((a, b) => a.month.localeCompare(b.month))}
                  options={{
                    xAxis: monthlyTrends
                      .sort((a, b) => a.month.localeCompare(b.month))
                      .map((item) => formatMonth(item.month)),
                    series: [
                      {
                        name: 'Total Transfers',
                        data: monthlyTrends
                          .sort((a, b) => a.month.localeCompare(b.month))
                          .map((item) => item.count),
                      },
                      {
                        name: 'Approved',
                        data: monthlyTrends
                          .sort((a, b) => a.month.localeCompare(b.month))
                          .map((item) => item.approved),
                      },
                      {
                        name: 'Rejected',
                        data: monthlyTrends
                          .sort((a, b) => a.month.localeCompare(b.month))
                          .map((item) => item.rejected || 0),
                      },
                    ],
                  }}
                />
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">No monthly data available</div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <h2 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-400 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-500" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
              <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
            </svg>
            Status Distribution
          </h2>
          <div className="border border-gray-100 rounded-lg p-2 bg-gray-50 dark:bg-gray-900">
            {statusDistribution && statusDistribution.length > 0 ? (
              <div className="flex flex-col">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4 ">
                  {statusDistribution.map((item) => {
                    // Define colors based on status
                    let bgColor = "bg-gray-100";
                    let textColor = "text-gray-600";
                    let valueColor = "text-indigo-600";

                    switch(item.status) {
                      case "PENDING":
                        bgColor = "bg-yellow-50";
                        textColor = "text-yellow-700";
                        valueColor = "text-yellow-600";
                        break;
                      case "IN_PROGRESS":
                        bgColor = "bg-blue-50";
                        textColor = "text-blue-700";
                        valueColor = "text-blue-600";
                        break;
                      case "COMPLETED":
                        bgColor = "bg-green-50";
                        textColor = "text-green-700";
                        valueColor = "text-green-600";
                        break;
                      case "REJECTED":
                        bgColor = "bg-red-50";
                        textColor = "text-red-700";
                        valueColor = "text-red-600";
                        break;
                      case "CANCELLED":
                        bgColor = "bg-gray-50";
                        textColor = "text-gray-700";
                        valueColor = "text-gray-600";
                        break;
                    }

                    return (
                      <div
                        key={item.status}
                        className={`text-center p-3 pl-1 rounded-lg ${bgColor} border border-gray-200 shadow-sm transition-all duration-300 dark:bg-gray-900 hover:shadow-md`}
                      >
                        <div className={`text-sm font-medium ${textColor}`}>{item.status}</div>
                        <div className={`text-2xl font-bold ${valueColor}`}>{item.count}</div>
                        <div className="text-sm font-medium text-gray-500">{item.percentage}%</div>
                      </div>
                    );
                  })}
                </div>
                <RoleBasedChart
                  type="pie"
                  data={statusDistribution.map((item) => ({
                    status: item.status,
                    value: item.count
                  }))}
                  options={{
                    labels: statusDistribution.map((item) => `${item.status} (${item.percentage}%)`),
                    customColors: statusDistribution.map((item) => {
                      switch(item.status) {
                        case "PENDING": return '#FBBF24'; // yellow-400
                        case "IN_PROGRESS": return '#3B82F6'; // blue-500
                        case "COMPLETED": return '#10B981'; // green-500
                        case "REJECTED": return '#EF4444'; // red-500
                        case "CANCELLED": return '#9CA3AF'; // gray-400
                        default: return '#6366F1'; // indigo-500
                      }
                    })
                  }}
                />
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">No status data available</div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <h2 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-500 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
            Monthly Approval Rates
          </h2>
          <div className="border border-gray-100 rounded-lg p-2 bg-gray-50 dark:bg-gray-900">
            {monthlyTrends && monthlyTrends.length > 0 ? (
              <>
                <div className="mb-4 grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-sm text-gray-500">Average Approval Rate</div>
                    <div className="text-xl font-bold text-amber-600">
                      {Math.round(monthlyTrends.reduce((sum, item) => sum + (item.approvalRate || 0), 0) / monthlyTrends.length)}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-500">Highest Rate</div>
                    <div className="text-xl font-bold text-green-600">
                      {Math.max(...monthlyTrends.map(item => item.approvalRate || 0))}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-500">Lowest Rate</div>
                    <div className="text-xl font-bold text-red-600">
                      {Math.min(...monthlyTrends.filter(item => (item.approvalRate || 0) > 0).map(item => item.approvalRate || 0)) || 0}%
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto ">
                  <table className="w-full text-sm mb-4 ">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-gray-900">
                        <th className="p-2 text-left">Month</th>
                        <th className="p-2 text-right">Total</th>
                        <th className="p-2 text-right">Approved</th>
                        <th className="p-2 text-right">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyTrends.map((item, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-900'}>
                          <td className="p-2 text-left">{item.month}</td>
                          <td className="p-2 text-right">{item.count}</td>
                          <td className="p-2 text-right">{item.approved}</td>
                          <td className="p-2 text-right font-medium" style={{ color: (item.approvalRate || 0) > 50 ? '#16a34a' : '#dc2626' }}>
                            {item.approvalRate || 0}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <RoleBasedChart
                  type="bar"
                  data={monthlyTrends.map(item => ({
                    month: item.month,
                    value: item.approvalRate || 0
                  }))}
                  options={{
                    xAxis: monthlyTrends.map((item) => item.month),
                    series: [
                      {
                        name: 'Approval Rate (%)',
                        data: monthlyTrends.map((item) => item.approvalRate || 0),
                      }
                    ],
                  }}
                />
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">No monthly approval rate data available</div>
            )}
          </div>
        </div>
      </div>

      {/* Location Transfer Summary */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md hover:shadow-xl transition-all duration-300">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Location Transfer Summary
          </h2>
          <div className="border border-gray-100 rounded-lg overflow-hidden dark:bg-gray-900">
            <RoleBasedTable
              data={locationTransfers}
              columns={[
                {
                  key: 'department',
                  header: 'Location',
                  render: (value) => (
                    <div className="font-medium text-gray-900 dark:text-white">{value}</div>
                  ),
                },
                {
                  key: 'outgoing',
                  header: 'Outgoing Transfers',
                  render: (value) => (
                    <div className="text-center bg-red-50 py-1 px-2 rounded-md text-red-700 font-medium">
                      {value}
                    </div>
                  ),
                },
                {
                  key: 'incoming',
                  header: 'Incoming Transfers',
                  render: (value) => (
                    <div className="text-center bg-green-50 py-1 px-2 rounded-md text-green-700 font-medium">
                      {value}
                    </div>
                  ),
                },
                {
                  key: 'netChange',
                  header: 'Net Change',
                  render: (_, item) => {
                    const netChange = item.incoming - item.outgoing;
                    return (
                      <div
                        className={`text-center py-1 px-2 rounded-md font-medium ${
                          netChange > 0
                            ? 'bg-green-100 text-green-700'
                            : netChange < 0
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {netChange > 0 ? '+' : ''}
                        {netChange}
                      </div>
                    );
                  },
                },
                {
                  key: 'avgProcessingDays',
                  header: 'Average Processing Time',
                  render: (value) => (
                    <div className="text-center bg-blue-50 py-1 px-2 rounded-md text-blue-700 font-medium">
                      {Math.round(value as number)} days
                    </div>
                  ),
                },
                // {
                //   key: 'actions',
                //   header: 'Actions',
                //   render: () => (
                //     <div className="flex justify-center space-x-2">
                //       <button className="p-1 rounded-md hover:bg-gray-100 transition-colors">
                //         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                //           <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                //           <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                //         </svg>
                //       </button>
                //       <button className="p-1 rounded-md hover:bg-blue-100 transition-colors">
                //         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                //           <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                //         </svg>
                //       </button>
                //     </div>
                //   ),
                // },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
