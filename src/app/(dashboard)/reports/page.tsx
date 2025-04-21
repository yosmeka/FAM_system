'use client';

import { useRouter } from 'next/navigation';
import { RoleBasedCard } from '@/components/ui/RoleBasedCard';

const reportTypes = [
  {
    title: 'Asset Reports',
    description: 'View asset valuation and distribution',
    path: '/reports/assets',
    icon: '📊',
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
    description: 'Monitor disposal trends and recovery',
    path: '/reports/disposals',
    icon: '📉',
  },
];

export default function ReportsPage() {
  const router = useRouter();

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">Reports Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {reportTypes.map((report) => (
          <RoleBasedCard
            title={report.title}
            key={report.path}
            onClick={() => router.push(report.path)}
            className="cursor-pointer hover:shadow-lg transition-shadow"
          >
            <div className="text-center">
              <p className="text-gray-600">{report.description}</p>
            </div>
          </RoleBasedCard>
        ))}
      </div>
    </div>
  );
}