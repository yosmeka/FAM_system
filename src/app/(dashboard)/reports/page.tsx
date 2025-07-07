'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { RoleBasedCard } from '@/components/ui/RoleBasedCard';

const reportTypes = [
  {
    title: 'Asset Reports',
    description: '📊 View asset valuation and distribution',
    path: '/reports/assets',
    icon: '📊',
  },
  {
    title: 'Audit Reports',
    description: '🔍 Track audit compliance and findings',
    path: '/reports/audits',
    icon: '🔍',
  },
  {
    title: 'Transfer Reports',
    description: '🔄 Analyze asset movement patterns',
    path: '/reports/transfers',
    icon: '🔄',
  },
  {
    title: 'Disposal Reports',
    description: '📉 Monitor disposal trends and recovery',
    path: '/reports/disposals',
    icon: '📉',
  },
  {
    title: 'Maintenance Reports',
    description: '🔍 Track maintenance activities and trends',
    path: '/reports/maintenance',
    icon: '🔍', 
  }
];

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-screen bg-white dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500 dark:border-red-400"></div>
      </div>
    );
  }

  if (session?.user?.role === 'AUDITOR') {
    // Allow auditors to see audit and asset reports only
    const auditorReportTypes = reportTypes.filter(report => report.path === '/reports/audits' || report.path === '/reports/assets');
    
    return (
      <div className="container mx-auto p-6 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Reports Dashboard</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {auditorReportTypes.map((report) => (
            <RoleBasedCard
              key={report.path}
              className="bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-105 transition-all duration-300"
              onClick={() => router.push(report.path)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <span className="text-2xl">{report.icon}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{report.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{report.description}</p>
                  </div>
                </div>
                <span className="text-gray-400 dark:text-gray-500 text-xl ml-2">→</span>
              </div>
            </RoleBasedCard>
          ))}
        </div>
      </div>
    );
  }

  if (session && session.user && session.user.role === 'MANAGER') {
    // Managers see all reports except USER-only (if any in future)
    return (
      <div className="container mx-auto p-6 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Reports Dashboard</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reportTypes.map((report) => (
            <RoleBasedCard
              key={report.path}
              className="bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-105 transition-all duration-300"
              onClick={() => router.push(report.path)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <span className="text-2xl">{report.icon}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{report.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{report.description}</p>
                  </div>
                </div>
                <span className="text-gray-400 dark:text-gray-500 text-xl ml-2">→</span>
              </div>
            </RoleBasedCard>
          ))}
        </div>
      </div>
    );
  }

  if (!session || !session.user) return null;
  if (session.user.role === 'ADMIN') {
    return (
      <div className="container mx-auto p-6 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <h1 className="text-2xl font-semibold text-center text-red-600 dark:text-red-400">Access Denied</h1>
        <p className="text-center text-gray-700 dark:text-gray-300">You do not have permission to view reports.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Reports Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reportTypes.map((report) => (
          <RoleBasedCard
            key={report.path}
            className="bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-105 transition-all duration-300"
            onClick={() => router.push(report.path)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <span className="text-2xl">{report.icon}</span>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{report.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{report.description}</p>
                </div>
              </div>
              <span className="text-gray-400 dark:text-gray-500 text-xl ml-2">→</span>
            </div>
          </RoleBasedCard>
        ))}
      </div>
    </div>
  );
}