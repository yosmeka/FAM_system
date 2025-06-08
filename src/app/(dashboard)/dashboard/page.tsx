'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js/auto';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { useQuery } from '@tanstack/react-query';
import { RoleBasedChart } from '@/components/ui/RoleBasedChart';

// Register Chart.js components
Chart.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface DashboardData {
  stats: {
    totalAssets: number;
    activeAssets: number;
    underMaintenanceAssets: number;
    totalValue: number;
  };
  monthlyDepreciation: Array<{
    month: string;
    depreciation: number;
  }>;
  statusDistribution: Array<{
    status: string;
    count: number;
  }>;
}

import { useState, useEffect } from 'react';
import { AdminRecentActivity } from '@/components/ui/AdminRecentActivity';
import { AdminCharts } from '@/components/ui/AdminCharts';
import { Toaster, toast } from 'react-hot-toast';
import { NotificationBell } from '@/components/ui/NotificationBell';

export default function DashboardPage() {
  const { data: session } = useSession();
  
  const [adminStats, setAdminStats] = useState<{ users: number; roles: number; permissions: number } | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);

  const isAdmin = session?.user?.role === 'ADMIN';

  useEffect(() => {
    if (isAdmin) {
      setAdminLoading(true);
      Promise.all([
        fetch('/api/users/count').then(async res => {
          if (!res.ok) return { count: 0 };
          try { return await res.json(); } catch { return { count: 0 }; }
        }),
        fetch('/api/roles/count').then(async res => {
          if (!res.ok) return { count: 0 };
          try { return await res.json(); } catch { return { count: 0 }; }
        }),
        fetch('/api/permissions/count').then(async res => {
          if (!res.ok) return { count: 0 };
          try { return await res.json(); } catch { return { count: 0 }; }
        })
      ]).then(([users, roles, permissions]) => {
        setAdminStats({
          users: users.count || 0,
          roles: roles.count || 0,
          permissions: permissions.count || 0,
        });
      }).finally(() => setAdminLoading(false));
    }
  }, [isAdmin]);

  // Animated count-up component
  const CountUp = ({ end }: { end: number }) => {
    const [count, setCount] = useState(0);
    useEffect(() => {
      let start = 0;
      if (end === undefined || end === null) return;
      const duration = 800;
      const step = Math.max(1, Math.ceil(end / 40));
      const interval = setInterval(() => {
        start += step;
        if (start >= end) {
          setCount(end);
          clearInterval(interval);
        } else {
          setCount(start);
        }
      }, duration / (end / step));
      return () => clearInterval(interval);
    }, [end]);
    return <span>{count}</span>;
  };

  // Fetch recent activity, charts, and notifications for admin
  const [recentActivity, setRecentActivity] = useState<any>(null);
  const [userGrowth, setUserGrowth] = useState<any[]>([]);
  const [permissionAssignments, setPermissionAssignments] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (isAdmin) {
      fetch('/api/admin/recent-activity')
        .then(async res => {
          if (!res.ok) return setRecentActivity(null);
          const contentType = res.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            setRecentActivity(null);
            return;
          }
          const data = await res.json();
          setRecentActivity(data);
        });
      fetch('/api/admin/user-growth')
        .then(async res => {
          if (!res.ok) return setUserGrowth([]);
          const contentType = res.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            setUserGrowth([]);
            return;
          }
          const data = await res.json();
          setUserGrowth(data.userGrowth || []);
        });
      fetch('/api/admin/permission-assignments')
        .then(async res => {
          if (!res.ok) return setPermissionAssignments([]);
          const contentType = res.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            setPermissionAssignments([]);
            return;
          }
          const data = await res.json();
          setPermissionAssignments(data.permissionAssignments || []);
        });
      fetch('/api/admin/notifications')
        .then(async res => {
          if (!res.ok) return setNotifications([]);
          const contentType = res.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            setNotifications([]);
            return;
          }
          const data = await res.json();
          setNotifications(data.notifications || []);
        });
    }
  }, [isAdmin]);

  if (isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-200 via-red-100 to-yellow-100 py-8 px-2 dark:bg-gray-900 dark:from-indigo-900 dark:via-red-900 dark:to-yellow-900">
        <Toaster position="top-right" />

        {/* Welcome Banner */}
        <div className="flex flex-col items-center mb-8">
          {session?.user?.image && (
            <img src={session.user.image} alt="avatar" className="w-20 h-20 rounded-full shadow-lg mb-2 border-4 border-indigo-400" />
          )}
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 via-red-500 to-yellow-500 mb-1 dark:from-indigo-400 dark:via-red-400 dark:to-yellow-400 drop-shadow-lg">Welcome, {session?.user?.name}</h1>
          <span className="text-lg text-gray-600 dark:text-gray-300 font-medium">System Administration Dashboard</span>
        </div>
        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 w-full max-w-4xl mb-10">
          <div className="bg-gradient-to-br from-indigo-500 via-indigo-300 to-white dark:from-indigo-900 dark:via-indigo-700 dark:to-gray-900 rounded-2xl shadow-2xl p-8 flex flex-col items-center border border-indigo-100 dark:border-indigo-800 hover:scale-105 transition-transform duration-200">
            <span className="text-5xl mb-2 animate-bounce">👥</span>
            <span className="text-5xl font-extrabold text-indigo-900 dark:text-indigo-100">
              {adminLoading ? '...' : <CountUp end={adminStats?.users ?? 0} />}
            </span>
            <span className="text-lg text-indigo-700 dark:text-indigo-300 mt-2 font-semibold tracking-wide">Total Users</span>
          </div>
          <div className="bg-gradient-to-br from-pink-400 via-red-300 to-white dark:from-pink-900 dark:via-red-700 dark:to-gray-900 rounded-2xl shadow-2xl p-8 flex flex-col items-center border border-red-100 dark:border-red-800 hover:scale-105 transition-transform duration-200">
            <span className="text-5xl mb-2 animate-bounce">🛡️</span>
            <span className="text-5xl font-extrabold text-red-900 dark:text-red-100">
              {adminLoading ? '...' : <CountUp end={adminStats?.roles ?? 0} />}
            </span>
            <span className="text-lg text-red-700 dark:text-red-300 mt-2 font-semibold tracking-wide">Roles</span>
          </div>
          <div className="bg-gradient-to-br from-yellow-300 via-yellow-100 to-white dark:from-yellow-900 dark:via-yellow-700 dark:to-gray-900 rounded-2xl shadow-2xl p-8 flex flex-col items-center border border-yellow-100 dark:border-yellow-800 hover:scale-105 transition-transform duration-200">
            <span className="text-5xl mb-2 animate-bounce">🔑</span>
            <span className="text-5xl font-extrabold text-yellow-700 dark:text-yellow-200">
              {adminLoading ? '...' : <CountUp end={adminStats?.permissions ?? 0} />}
            </span>
            <span className="text-lg text-yellow-700 dark:text-yellow-200 mt-2 font-semibold tracking-wide">Permissions</span>
          </div>
        </div>
        {/* Quick Actions */}
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-indigo-700 dark:text-indigo-400 mb-3 drop-shadow">Quick Actions</h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/users" className="bg-indigo-600 text-white px-8 py-3 rounded-xl shadow-lg hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800 transition font-semibold text-lg">Manage Users</a>
            <a href="/role-permission" className="bg-red-600 text-white px-8 py-3 rounded-xl shadow-lg hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 transition font-semibold text-lg">Manage Roles & Permissions</a>
          </div>
        </div>
        {/* Charts */}
        <AdminCharts userGrowth={userGrowth} permissionAssignments={permissionAssignments} />
        {/* Recent Activity / System Logs */}
        <div className="w-full flex flex-col items-center">
          <AdminRecentActivity activity={recentActivity || {}} />
        </div>
      </div>
    );
  }

  const { data: dashboardData, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboardData'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const stats = [
    { name: 'Total Assets', value: dashboardData?.stats.totalAssets.toString() || '0' },
    { name: 'Active Assets', value: dashboardData?.stats.activeAssets.toString() || '0' },
    { name: 'Under Maintenance', value: dashboardData?.stats.underMaintenanceAssets.toString() || '0' },
    { 
      name: 'Total Value', 
      value: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(dashboardData?.stats.totalValue || 0)
    },
  ];

  const statusDistributionData = {
    labels: dashboardData?.statusDistribution.map((item) => item.status) || [],
    datasets: [
      {
        data: dashboardData?.statusDistribution.map((item) => item.count) || [],
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 99, 132, 0.6)',
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 99, 132, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Sort monthly depreciation data by month
  const sortedDepreciation = dashboardData?.monthlyDepreciation?.sort((a, b) => {
    const dateA = new Date(a.month);
    const dateB = new Date(b.month);
    return dateA.getTime() - dateB.getTime();
  }) || [];

  const monthlyDepreciationData = {
    labels: sortedDepreciation.map((item) => {
      const date = new Date(item.month);
      return date.toLocaleString('default', { month: 'short' });
    }),
    datasets: [
      {
        label: 'Monthly Depreciation',
        data: sortedDepreciation.map((item) => item.depreciation),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
      },
    ],
  };

  return (
    <div className="dark:bg-gray-900 dark:text-gray-100">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Welcome back, <span className="font-bold text-red-600">{session?.user?.name}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <div
            key={item.name}
            className="relative overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 pt-5 pb-12 shadow sm:px-6 sm:pt-6"
          >
            <dt>
              <div className="absolute rounded-md bg-indigo-500 p-3">
                <svg
                  className="h-6 w-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="ml-16 truncate text-sm font-medium text-gray-500 dark:text-gray-400">
                {item.name}
              </p>
            </dt>
            <dd className="ml-16 flex items-baseline pb-6 sm:pb-7">
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {item.value}
              </p>
            </dd>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="bg-white p-6 rounded-lg shadow dark:bg-gray-900">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Asset Status Distribution
          </h2>
          <div className="h-80">
            <Pie data={statusDistributionData} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow dark:bg-gray-900">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Monthly Depreciation
          </h2>
          <div className="h-80">
            <Bar
              data={monthlyDepreciationData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: (value) => {
                        if (typeof value === 'number') {
                          return new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(value);
                        }
                        return '';
                      },
                    },
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RoleBasedChart
          type="bar"
          data={{
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [
              {
                label: 'Asset Value',
                data: [12000, 19000, 15000, 25000, 22000, 30000],
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1,
              },
            ],
          }}
          title="Asset Value Distribution"
          permission="view_analytics"
        />
        <RoleBasedChart
          type="line"
          data={{
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [
              {
                label: 'Asset Growth',
                data: [0, 10, 5, 15, 10, 20],
                fill: false,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1,
              },
            ],
          }}
          title="Asset Growth Trend"
          permission="view_analytics"
        />
      </div>
    </div>
  );
} 