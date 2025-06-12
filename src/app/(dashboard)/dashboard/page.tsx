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
  PointElement,
  LineElement,
} from 'chart.js/auto';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { useQuery } from '@tanstack/react-query';
import { RoleBasedChart } from '@/components/ui/RoleBasedChart';

interface CustomUser {
  id: string;
  email: string;
  name: string;
  role: string;
  image?: string;
}

// Register Chart.js components
Chart.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

interface DashboardData {
  stats: {
    totalAssets: number;
    activeAssets: number;
    disposedAssets: number;
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
  categoryDistribution: Array<{
    category: string;
    count: number;
    value: number;
  }>;
  valueTrend: Array<{
    month: string;
    value: number;
  }>;
}

import { useState, useEffect } from 'react';
import { AdminRecentActivity } from '@/components/ui/AdminRecentActivity';
import { AdminCharts } from '@/components/ui/AdminCharts';
import { Toaster, toast } from 'react-hot-toast';
import { NotificationBell } from '@/components/ui/NotificationBell';

export default function DashboardPage() {
  const { data: session } = useSession();
  const user = session?.user as CustomUser | undefined;
  
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#ff0000] via-[#000000] to-[#ffffff] py-8 px-2 dark:bg-gray-900 dark:from-[#ff0000] dark:via-[#000000] dark:to-[#ffffff]">
        <Toaster position="top-right" />

        {/* Welcome Banner */}
        <div className="flex flex-col items-center mb-8">
          {user?.image && (
            <img src={user.image} alt="avatar" className="w-20 h-20 rounded-full shadow-lg mb-2 border-4 border-[#ff0000]" />
          )}
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#ff0000] via-[#000000] to-[#ffffff] mb-1 dark:from-[#ff0000] dark:via-[#000000] dark:to-[#ffffff] drop-shadow-lg">Welcome, {user?.name}</h1>
          <span className="text-lg text-gray-600 dark:text-gray-300 font-medium">System Administration Dashboard</span>
        </div>
        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 w-full max-w-4xl mb-10">
          <div className="bg-gradient-to-br from-[#ff0000] via-[#000000] to-[#ffffff] dark:from-[#ff0000] dark:via-[#000000] dark:to-[#ffffff] rounded-2xl shadow-2xl p-8 flex flex-col items-center border border-[#ff0000] dark:border-[#ff0000] hover:scale-105 transition-transform duration-200">
            <span className="text-5xl mb-2 animate-bounce">👥</span>
            <span className="text-5xl font-extrabold text-[#ffffff] dark:text-[#ffffff]">
              {adminLoading ? '...' : <CountUp end={adminStats?.users ?? 0} />}
            </span>
            <span className="text-lg text-[#ffffff] dark:text-[#ffffff] mt-2 font-semibold tracking-wide">Total Users</span>
          </div>
          <div className="bg-gradient-to-br from-[#ff0000] via-[#000000] to-[#ffffff] dark:from-[#ff0000] dark:via-[#000000] dark:to-[#ffffff] rounded-2xl shadow-2xl p-8 flex flex-col items-center border border-[#ff0000] dark:border-[#ff0000] hover:scale-105 transition-transform duration-200">
            <span className="text-5xl mb-2 animate-bounce">🛡️</span>
            <span className="text-5xl font-extrabold text-[#ffffff] dark:text-[#ffffff]">
              {adminLoading ? '...' : <CountUp end={adminStats?.roles ?? 0} />}
            </span>
            <span className="text-lg text-[#ffffff] dark:text-[#ffffff] mt-2 font-semibold tracking-wide">Roles</span>
          </div>
          <div className="bg-gradient-to-br from-[#ff0000] via-[#000000] to-[#ffffff] dark:from-[#ff0000] dark:via-[#000000] dark:to-[#ffffff] rounded-2xl shadow-2xl p-8 flex flex-col items-center border border-[#ff0000] dark:border-[#ff0000] hover:scale-105 transition-transform duration-200">
            <span className="text-5xl mb-2 animate-bounce">🔑</span>
            <span className="text-5xl font-extrabold text-[#ffffff] dark:text-[#ffffff]">
              {adminLoading ? '...' : <CountUp end={adminStats?.permissions ?? 0} />}
            </span>
            <span className="text-lg text-[#ffffff] dark:text-[#ffffff] mt-2 font-semibold tracking-wide">Permissions</span>
          </div>
        </div>
        {/* Quick Actions */}
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-[#ff0000] dark:text-[#ff0000] mb-3 drop-shadow">Quick Actions</h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/users" className="bg-[#ff0000] text-white px-8 py-3 rounded-xl shadow-lg hover:bg-[#ff0000]/80 dark:bg-[#ff0000] dark:hover:bg-[#ff0000]/80 transition font-semibold text-lg">Manage Users</a>
            <a href="/role-permission" className="bg-[#000000] text-white px-8 py-3 rounded-xl shadow-lg hover:bg-[#000000]/80 dark:bg-[#000000] dark:hover:bg-[#000000]/80 transition font-semibold text-lg">Manage Roles & Permissions</a>
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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ff0000]"></div>
      </div>
    );
  }

  const stats = [
    { name: 'Total Assets', value: dashboardData?.stats.totalAssets.toString() || '0' },
    { name: 'Active Assets', value: dashboardData?.stats.activeAssets.toString() || '0' },
    { name: 'Disposed Assets', value: dashboardData?.stats.disposedAssets.toString() || '0' },
    { 
      name: 'Total Purchase Price', 
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
          '#ff0000',
          '#000000',
          '#ffffff',
          'gray',
        ],
        borderColor: [
          '#ff0000',
          '#000000',
          '#ffffff',
          'gray',
        ],
        borderWidth: 1,
      },
    ],
  };

  const categoryDistributionData = {
    labels: dashboardData?.categoryDistribution.map((item) => item.category) || [],
    datasets: [
      {
        data: dashboardData?.categoryDistribution.map((item) => item.count) || [],
        backgroundColor: [
          '#ff0000',
          '#000000',
          '#ffffff',
          'gray',
          '#ff0000',
          '#000000',
          '#ffffff',
          'gray',
          '#ff0000',
          '#000000',
          '#ffffff',
        ],
        borderColor: [
          '#ff0000',
          '#000000',
          '#ffffff',
          'gray',
          '#ff0000',
          '#000000',
          '#ffffff',
          'gray',
          '#ff0000',
          '#000000',
          '#ffffff',
        ],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="dark:bg-gray-900 dark:text-gray-100">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Welcome back, <span className="font-bold text-[#ff0000]">{session?.user?.name}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <div
            key={item.name}
            className="relative overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 pt-5 pb-12 shadow sm:px-6 sm:pt-6"
          >
            <dt>
              <div className="absolute rounded-md bg-[#ff0000] p-3">
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
            Asset Category Distribution
          </h2>
          <div className="h-80">
            <Pie data={categoryDistributionData} />
          </div>
        </div>
      </div>
    </div>
  );
} 