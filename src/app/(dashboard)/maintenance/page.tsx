'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/hooks/useRole';
import { Plus, Settings, CheckCircle } from 'lucide-react';

export default function MaintenancePage() {
  const { data: session } = useSession();
  const { isManager, isAdmin, isUser } = useRole();
  const router = useRouter();

  const maintenanceOptions = [
    {
      title: 'Scheduled Maintenance',
      description: 'Manage preventive maintenance schedules and tasks',
      icon: Plus,
      href: '/maintenance/scheduled',
      color: 'bg-blue-600',
      roles: ['MANAGER']
    },
    {
      title: 'Report Issues',
      description: 'Submit corrective maintenance requests for asset problems',
      icon: Plus,
      href: '/maintenance/request-issue',
      color: 'bg-red-600',
      roles: ['USER']
    },
    {
      title: 'Review Requests',
      description: 'Review and approve corrective maintenance requests from technicians',
      icon: CheckCircle,
      href: '/maintenance/requests',
      color: 'bg-green-600',
      roles: ['MANAGER']
    },
    {
      title: 'Review Completed Work',
      description: 'Review and approve completed maintenance work and costs',
      icon: CheckCircle,
      href: '/maintenance/work-review',
      color: 'bg-orange-600',
      roles: ['MANAGER']
    },
    {
      title: 'My Tasks',
      description: 'View and work on assigned maintenance tasks',
      icon: Plus,
      href: '/maintenance/tasks',
      color: 'bg-purple-600',
      roles: ['USER']
    },
    {
      title: 'Templates',
      description: 'Manage maintenance templates and procedures',
      icon: Settings,
      href: '/maintenance/templates',
      color: 'bg-gray-600',
      roles: ['MANAGER',]
    }
  ];




// Show nothing until session is loaded
  if (status === 'loading') return null;

  // If not allowed, show access denied
  if (session?.user?.role === 'AUDITOR') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="bg-white p-8 rounded shadow text-center">
          <h1 className="text-2xl font-bold mb-2 text-red-600">Access Denied</h1>
          <p className="text-gray-700">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }






  const userRole = session?.user?.role;
  const filteredOptions = maintenanceOptions.filter(option =>
    option.roles.includes(userRole || '')
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Settings className="w-8 h-8 text-blue-400" />
          <h1 className="text-3xl font-bold dark:text-white">Maintenance Management</h1>
        </div>
        <p className="text-gray-400 text-lg">
          Comprehensive maintenance management for all your assets
        </p>
      </div>

      {/* Maintenance Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {filteredOptions.map((option) => {
          const IconComponent = option.icon;
          return (
            <div
              key={option.href}
              onClick={() => router.push(option.href)}
              className="p-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className={`p-3 rounded-lg ${option.color}`}>
                  <IconComponent className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold dark:text-white">
                  {option.title}
                </h3>
              </div>
              <p className="text-gray-400 leading-relaxed">
                {option.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Quick Stats */}
      <div className="mt-12 max-w-4xl mx-auto">
        <h2 className="text-xl font-semibold text-white mb-6 text-center">
          Maintenance Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-400 mb-2">
              Preventive
            </div>
            <p className="text-gray-400">Scheduled maintenance to prevent issues</p>
          </div>
          <div className="p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-400 mb-2">
              Corrective
            </div>
            <p className="text-gray-400">Fix issues when they occur</p>
          </div>
          <div className="p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-400 mb-2">
              Predictive
            </div>
            <p className="text-gray-400">Data-driven maintenance planning</p>
          </div>
        </div>
      </div>
    </div>
  );
}




