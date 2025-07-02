'use client';

import React, { useState, useEffect } from "react";
import { RoleBasedTable } from '@/components/ui/RoleBasedTable';
import { RoleBasedChart } from '@/components/ui/RoleBasedChart';
import { RoleBasedStats } from '@/components/ui/RoleBasedStats';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, CheckCircle } from 'lucide-react';
import { generatePdf } from '@/lib/generatePdf';
import { useSession } from 'next-auth/react';
import { BackButton } from "@/components/ui/BackButton";
import { toast } from 'react-hot-toast';
import { ToastContainer } from "react-toastify";


export default function MaintenanceReportsPage() {
  const { data: session, status } = useSession(); // Destructure session and status from useSession

  // All hooks must be at the top, before any early returns!
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [maintenanceStats, setMaintenanceStats] = useState<unknown>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [statusDistribution, setStatusDistribution] = useState<unknown[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [priorityDistribution, setPriorityDistribution] = useState<unknown[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [departmentDistribution, setDepartmentDistribution] = useState<unknown[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [monthlyTrends, setMonthlyTrends] = useState<unknown[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [topAssets, setTopAssets] = useState<unknown[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [recentActivity, setRecentActivity] = useState<unknown[]>([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState('12months');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [generatedOn, setGeneratedOn] = useState<string>("");
  const [generatedTime, setGeneratedTime] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [debug, setDebug] = useState<any>(null);


  useEffect(() => {
    fetchMaintenanceReports();
    setGeneratedOn(new Date().toLocaleDateString());
    setGeneratedTime(new Date().toLocaleTimeString());
  }, [selectedTimeRange, selectedDepartment]);

  const fetchMaintenanceReports = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching maintenance reports...');
      const response = await fetch('/api/reports/maintenance');
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch maintenance reports: ${response.status} ${errorText}`);
      }
      const data = await response.json();
      console.log('Maintenance reports data:', data);
      setDebug({
        statusDistributionLength: data.statusDistribution?.length || 0,
        priorityDistributionLength: data.priorityDistribution?.length || 0,
        departmentDistributionLength: data.departmentDistribution?.length || 0,
        monthlyTrendsLength: data.monthlyTrends?.length || 0,
        topAssetsLength: data.topAssets?.length || 0,
        recentActivityLength: data.recentActivity?.length || 0,
      });
      setMaintenanceStats(data.stats);
      setStatusDistribution(data.statusDistribution || []);
      setPriorityDistribution(data.priorityDistribution || []);
      setDepartmentDistribution(data.departmentDistribution || []);
      setMonthlyTrends(data.monthlyTrends || []);
      setTopAssets(data.topAssets || []);
      setRecentActivity(data.recentActivity || []);
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async () => {
    try {
      // Generate PDF with maintenance data
      await generatePdf({
        title: 'Maintenance Report',
        data: [
          {
            category: 'Total Maintenance Requests',
            count: maintenanceStats?.totalRequests || 0,
            value: 0
          },
          {
            category: 'Completed Requests',
            count: maintenanceStats?.completedRequests || 0,
            value: 0
          },
          {
            category: 'Pending Requests',
            count: maintenanceStats?.pendingRequests || 0,
            value: 0
          },
          {
            category: 'Average Response Time',
            count: 1,
            value: maintenanceStats?.averageResponseTime || 0
          }
        ],
        type: 'category'
      });

      toast.success('Report exported successfully!');
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Failed to export report');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
      </div>
    );
  }

  // If not allowed, show access denied
  if (status === 'unauthenticated' || session?.user?.role === 'AUDITOR') {
    return (
      <div className="flex items-center justify-center min-h-screen dark:bg-gray-900">
        <div className="bg-gray-100 dark:bg-gray-800 p-8 rounded shadow text-center">
          <h1 className="text-2xl font-bold mb-2 text-red-600 dark:text-red-400">Access Denied</h1>
          <p className="text-gray-700 dark:text-gray-300">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h1 className="text-2xl font-bold text-red-700 mb-4">Error Loading Maintenance Reports</h1>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchMaintenanceReports} variant="outline">
            <span className="h-4 w-4 mr-2">⟳</span>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 bg-gray-50 min-h-screen dark:bg-gray-900">
      {/* Header Section */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6 dark:bg-gray-900">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4 mb-2">
            <BackButton href="/reports" className="text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-400 mb-2">Maintenance Reports</h1>
            <p className="text-gray-600">Comprehensive overview of maintenance activities and performance</p>
          </div>
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
              <SelectTrigger className="w-40">
                <span className="inline-block h-4 w-4 mr-2">📅</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3months">Last 3 Months</SelectItem>
                <SelectItem value="6months">Last 6 Months</SelectItem>
                <SelectItem value="12months">Last 12 Months</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            {/* <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-40">
                <span className="inline-block h-4 w-4 mr-2">⏷</span>
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departmentDistribution.map((dept) => (
                  <SelectItem key={dept.department} value={dept.department}>
                    {dept.department}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select> */}
            <Button onClick={handleExportReport} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={fetchMaintenanceReports} variant="outline">
              <span className="h-4 w-4 mr-2">⟳</span>
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Enhanced Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <RoleBasedStats
          name="Total Requests"
          value={maintenanceStats?.totalRequests || 0}
          trend={maintenanceStats?.requestGrowth || 0}
          trendLabel="vs last month"
          variant="info"
          description="All maintenance requests"
        />
        <RoleBasedStats
          name="Pending Approval"
          value={maintenanceStats?.pendingRequests || 0}
          variant="warning"
          description="Awaiting manager approval"
        />
        <RoleBasedStats
          name="Completion Rate"
          value={`${maintenanceStats?.completionRate || 0}%`}
          variant="success"
          description="Successfully completed requests"
        />
        <RoleBasedStats
          name="High Priority"
          value={`${maintenanceStats?.highPriorityPercentage || 0}%`}
          variant="danger"
          description="Critical and high priority requests"
        />
      </div>

      {/* Time and Efficiency Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <RoleBasedStats
          name="Avg Resolution Time"
          value={`${maintenanceStats?.avgResolutionDays || 0} days`}
          variant="default"
          description="From scheduled to completed"
        />
        <RoleBasedStats
          name="Avg Time to Approval"
          value={`${maintenanceStats?.avgTimeToApproval || 0} days`}
          variant="info"
          description="From request to approval"
        />
        <RoleBasedStats
          name="Maintenance Efficiency"
          value={`${maintenanceStats?.maintenanceEfficiency || 0}%`}
          variant="success"
          description="Completed vs scheduled tasks"
        />
        <RoleBasedStats
          name="Cost Efficiency"
          value={`$${(maintenanceStats?.costEfficiency || 0).toFixed(2)}`}
          variant="default"
          description="Avg cost per completed task"
        />
      </div>

      {/* Cost Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <RoleBasedStats
          name="Total Maintenance Cost"
          value={`$${(maintenanceStats?.totalCost || 0).toLocaleString()}`}
          variant="info"
          description="All maintenance expenses"
        />
        <RoleBasedStats
          name="Average Cost per Request"
          value={`$${(maintenanceStats?.avgCostPerRequest || 0).toFixed(2)}`}
          variant="default"
          description="Cost efficiency metric"
        />
      </div>

      {/* Enhanced Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Status Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm dark:bg-gray-900">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Request Status Distribution</h2>
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          {statusDistribution && statusDistribution.length > 0 ? (
            <RoleBasedChart
              type="pie"
              data={statusDistribution}
              options={{
                labels: statusDistribution.map((item) => item.status),
                values: statusDistribution.map((item) => item.count),
                customColors: ['#10B981', '#F59E0B', '#EF4444', '#6B7280', '#3B82F6', '#8B5CF6', '#EC4899'],
              }}
            />
          ) : (
            <div className="p-8 text-center text-gray-500">
              <p>No status data available</p>
            </div>
          )}
        </div>

        {/* Priority Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm dark:bg-gray-900">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Priority Distribution</h2>
            <span className="inline-block h-5 w-5 text-orange-600">⚠️</span>
          </div>
          {priorityDistribution && priorityDistribution.length > 0 ? (
            <RoleBasedChart
              type="pie"
              data={priorityDistribution}
              options={{
                labels: priorityDistribution.map((item) => item.priority),
                values: priorityDistribution.map((item) => item.count),
                customColors: ['#EF4444', '#F59E0B', '#10B981', '#6B7280'],
              }}
            />
          ) : (
            <div className="p-8 text-center text-gray-500">
              <p>No priority data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Monthly Trends and Department Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 dark:bg-gray-900">
        {/* Monthly Trends - Takes 2 columns */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Monthly Maintenance Trends</h2>
            <span className="inline-block h-5 w-5 text-blue-600">📈</span>
          </div>
          {monthlyTrends && monthlyTrends.length > 0 ? (
            <RoleBasedChart
              type="line"
              data={monthlyTrends}
              options={{
                xAxis: monthlyTrends.map((item) => {
                  return item.monthDisplay || new Date(item.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                }),
                series: [
                  {
                    name: 'Total Requests',
                    data: monthlyTrends.map((item) => item.count || 0),
                  },
                  {
                    name: 'Completed',
                    data: monthlyTrends.map((item) => item.completed || 0),
                  },
                  {
                    name: 'High Priority',
                    data: monthlyTrends.map((item) => item.highPriority || 0),
                  },
                ],
              }}
            />
          ) : (
            <div className="p-8 text-center text-gray-500">
              <p>No monthly trend data available</p>
            </div>
          )}
        </div>

        {/* Department Distribution
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">By Department</h2>
            <span className="inline-block h-5 w-5 text-purple-600">⏷</span>
          </div>
          {departmentDistribution && departmentDistribution.length > 0 ? (
            <RoleBasedChart
              type="bar"
              data={departmentDistribution}
              options={{
                labels: departmentDistribution.map((item) => item.department || 'Unknown'),
                values: departmentDistribution.map((item) => item.count || 0),
                customColors: ['#3B82F6'],
              }}
            />
          ) : (
            <div className="p-8 text-center text-gray-500">
              <p>No department data available</p>
            </div>
          )}
        </div> */}
      </div>

      {/* Enhanced Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 dark:bg-gray-900">
        {/* Top Assets Requiring Maintenance - Takes 2 columns */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm dark:bg-gray-900">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Top Assets Requiring Maintenance</h2>
              <span className="inline-block h-5 w-5 text-red-600">⚠️</span>
            </div>
            {topAssets && topAssets.length > 0 ? (
              <RoleBasedTable
                data={topAssets}
                columns={[
                  {
                    key: 'name',
                    header: 'Asset Name',
                    className: 'font-medium text-gray-900',
                    render: (value) => value || 'Unknown Asset',
                  },
                  {
                    key: 'serialNumber',
                    header: 'Serial Number',
                    className: 'text-gray-600 font-mono text-sm',
                    render: (value) => value || 'N/A',
                  },
                  {
                    key: 'department',
                    header: 'Department',
                    className: 'text-gray-600',
                    render: (value) => value || 'Unassigned',
                  },
                  {
                    key: 'totalRequests',
                    header: 'Requests',
                    className: 'text-center font-semibold',
                    render: (value) => value || 0,
                  },
                  {
                    key: 'criticalRequests',
                    header: 'Critical',
                    className: 'text-center',
                    render: (value) => (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        (value as number) > 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {value as number || 0}
                      </span>
                    ),
                  },
                  {
                    key: 'lastMaintenance',
                    header: 'Last Maintenance',
                    render: (value) => (
                      <span className={`text-sm ${
                        value ? 'text-gray-600' : 'text-red-600 font-medium'
                      }`}>
                        {value ? new Date(value as string).toLocaleDateString() : 'Never'}
                      </span>
                    ),
                  },
                  {
                    key: 'averageCost',
                    header: 'Avg Cost',
                    render: (value) => (
                      <span className="font-medium text-green-600">
                        {value ? `$${(value as number).toFixed(2)}` : 'N/A'}
                      </span>
                    ),
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (value) => (
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          value === 'Due'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {value || 'Unknown'}
                      </span>
                    ),
                  },
                ]}
              />
            ) : (
              <div className="p-8 text-center text-gray-500">
                <p>No maintenance data available for assets</p>
                <p className="text-sm mt-2">This could be because no maintenance requests have been created yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-white rounded-lg shadow-sm dark:bg-gray-900">
          <div className="p-6 dark:bg-gray-900">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
              <span className="inline-block h-5 w-5 text-blue-600">🕒</span>
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto dark:bg-gray-900">
              {recentActivity && recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                    <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                      activity.status === 'COMPLETED' ? 'bg-green-500' :
                      activity.status === 'IN_PROGRESS' ? 'bg-blue-500' :
                      activity.priority === 'CRITICAL' ? 'bg-red-500' :
                      activity.priority === 'HIGH' ? 'bg-orange-500' : 'bg-gray-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate dark:text-white">
                        {activity.asset?.name || 'Unknown Asset'}
                      </p>
                      <p className="text-xs text-gray-600 truncate">
                        {activity.description || 'No description'}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          activity.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                          activity.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                          activity.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {activity.priority || 'Unknown'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {activity.timeAgo || (activity.createdAt ? new Date(activity.createdAt).toLocaleDateString() : 'Unknown date')}
                        </span>
                      </div>
                      {activity.cost && (
                        <p className="text-xs text-green-600 font-medium mt-1">
                          Cost: ${Number(activity.cost).toFixed(2)}
                        </p>
                      )}
                      {activity.requester?.name && (
                        <p className="text-xs text-blue-600 mt-1">
                          Requested by: {activity.requester.name}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-gray-500">
                  No recent maintenance activities found
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white rounded-lg shadow-sm p-6 text-center dark:bg-gray-900">
        <p className="text-gray-600 text-sm">
          Report generated on {generatedOn} at {generatedTime}
        </p>
        <p className="text-gray-500 text-xs mt-1">
          Data includes all maintenance requests and activities across the organization
        </p>

        {/* Debug Information */}
        {debug && (
          <div className="mt-4 p-4 bg-gray-100 rounded-lg text-left dark:bg-gray-900">
            <p className="text-sm font-semibold mb-2">Debug Information:</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              <div>Status Distribution: {debug.statusDistributionLength}</div>
              <div>Priority Distribution: {debug.priorityDistributionLength}</div>
              <div>Department Distribution: {debug.departmentDistributionLength}</div>
              <div>Monthly Trends: {debug.monthlyTrendsLength}</div>
              <div>Top Assets: {debug.topAssetsLength}</div>
              <div>Recent Activity: {debug.recentActivityLength}</div>
            </div>
            <div className="mt-2 text-xs">
              <p>Total Requests: {maintenanceStats?.totalRequests || 0}</p>
              <p>API Response: {maintenanceStats ? 'Success' : 'Failed'}</p>
            </div>
          </div>
        )}
      </div>
      <ToastContainer/>
    </div>
  );
}
