'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { RoleBasedCard } from '@/components/ui/RoleBasedCard';

const reportTypes = [
  {
    title: 'Asset Reports',
    description: '📊 View asset valuation and distribution',
    path: '/reports/assets',
  },
  {
    title: 'Maintenance Reports',
    description: 'Track maintenance history and status',
    path: '/reports/maintenance',
    icon: '🔧',
  },
  {
    title: 'Transfer Reports',
    description: 'Analyze asset movement patterns',
    path: '/reports/transfers',
    icon: '🔄',
  },
  {
    title: 'Disposal Reports',
    description: '📉 Monitor disposal trends and recovery',
    path: '/reports/disposals',
  },
];

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === 'loading') return null;
  if (!session || !session.user) return null;
  if (session.user.role === 'ADMIN') {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-semibold text-center text-red-600">Access Denied</h1>
        <p className="text-center">You do not have permission to view reports.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen">
      <h1 className="text-2xl font-semibold mb-6">Reports Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {reportTypes.map((report) => (
          <RoleBasedCard
            title={report.title}
            key={report.path}
            description={report.description}
            onClick={() => router.push(report.path)}
            className="cursor-pointer hover:shadow-lg transition-shadow hover:scale-105"
          />
        ))}
      </div>
    </div>
  );
}