'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Eye, Edit, FileText } from 'lucide-react';

interface MaintenanceTemplate {
  id: string;
  name: string;
  description: string;
  maintenanceType: string;
  instructions?: string;
  estimatedHours?: number;
  checklistItems: string[];
  toolsRequired: string[];
  partsRequired: string[];
  safetyNotes?: string;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  _count?: {
    maintenanceSchedules: number;
  };
}

export default function MaintenanceTemplatesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [templates, setTemplates] = useState<MaintenanceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      console.log('Fetching templates...');
      const response = await fetch('/api/maintenance-templates');
      console.log('Templates response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Templates data received:', data);
        setTemplates(data);
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch templates:', response.status, errorText);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

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

  const deleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/maintenance-templates/${templateId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Template deleted successfully');
        fetchTemplates(); // Refresh the list
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Failed to delete template: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template');
    }
  };

  const canManageTemplates = () => {
    return session?.user?.role === 'MANAGER' || session?.user?.role === 'ADMIN';
  };

  const getMaintenanceTypeColor = (type: string) => {
    switch (type.toUpperCase()) {
      case 'PREVENTIVE': return 'bg-green-600';
      case 'CORRECTIVE': return 'bg-orange-600';
      case 'PREDICTIVE': return 'bg-blue-600';
      case 'EMERGENCY': return 'bg-red-600';
      case 'ROUTINE': return 'bg-gray-600';
      default: return 'bg-gray-600';
    }
  };

  const filteredTemplates = filter === 'all'
    ? templates
    : templates.filter(template => template.maintenanceType.toLowerCase() === filter.toLowerCase());

  const maintenanceTypes = ['all', 'PREVENTIVE', 'CORRECTIVE', 'PREDICTIVE', 'EMERGENCY', 'ROUTINE'];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#212332' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: '#2697FF' }}></div>
      </div>
    );
  }

  return (
    <div className="p-6" style={{ backgroundColor: '#212332', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Maintenance Templates</h1>
          <p className="text-gray-400">Manage standardized maintenance procedures and checklists</p>
        </div>

        {canManageTemplates() && (
          <button
            onClick={() => router.push('/maintenance/templates/create')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
            style={{ backgroundColor: '#2697FF' }}
          >
            <Plus className="w-4 h-4" />
            Create Template
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {maintenanceTypes.map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
              filter === type
                ? 'text-white'
                : 'text-gray-400 hover:text-white'
            }`}
            style={{
              backgroundColor: filter === type ? '#2697FF' : '#2A2D3E',
            }}
          >
            {type === 'all' ? 'All Templates' : type.charAt(0) + type.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Debug Info */}
      <div className="mb-4 p-4 bg-gray-800 rounded-lg">
        <p className="text-white text-sm">
          Debug: Found {templates.length} templates, Loading: {loading.toString()}, Filter: {filter}
        </p>
        <p className="text-gray-400 text-xs">
          Filtered: {filteredTemplates.length} templates
        </p>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className="p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
            style={{ backgroundColor: '#2A2D3E' }}
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-1">
                  {template.name}
                </h3>
                <span className={`inline-block px-2 py-1 rounded text-xs font-medium text-white ${getMaintenanceTypeColor(template.maintenanceType)}`}>
                  {template.maintenanceType}
                </span>
              </div>
            </div>

            {/* Description */}
            <p className="text-gray-300 text-sm mb-4 line-clamp-2">
              {template.description}
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div>
                <span className="text-gray-400">Checklist Items:</span>
                <p className="text-white font-medium">{template.checklistItems.length}</p>
              </div>
              <div>
                <span className="text-gray-400">Est. Hours:</span>
                <p className="text-white font-medium">{template.estimatedHours || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-400">Tools Required:</span>
                <p className="text-white font-medium">{template.toolsRequired.length}</p>
              </div>
              <div>
                <span className="text-gray-400">Used in Schedules:</span>
                <p className="text-white font-medium">{template._count?.maintenanceSchedules || 0}</p>
              </div>
            </div>

            {/* Creator */}
            <div className="text-xs text-gray-400 mb-4">
              Created by {template.createdBy.name} on {new Date(template.createdAt).toLocaleDateString()}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/maintenance/templates/${template.id}`)}
                className="flex items-center gap-1 px-3 py-1 rounded text-xs text-white transition-colors"
                style={{ backgroundColor: '#2697FF' }}
              >
                <Eye className="w-3 h-3" />
                View
              </button>

              {canManageTemplates() && (
                <>
                  <button
                    onClick={() => router.push(`/maintenance/templates/${template.id}/edit`)}
                    className="flex items-center gap-1 px-3 py-1 rounded text-xs text-white bg-green-600 hover:bg-green-700 transition-colors"
                  >
                    <Edit className="w-3 h-3" />
                    Edit
                  </button>

                  <button
                    onClick={() => deleteTemplate(template.id)}
                    className="flex items-center gap-1 px-3 py-1 rounded text-xs text-white bg-red-600 hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            {filter === 'all' ? 'No Templates Found' : `No ${filter} Templates Found`}
          </h3>
          <p className="text-gray-400 mb-6">
            {canManageTemplates()
              ? 'Create your first maintenance template to standardize procedures.'
              : 'No maintenance templates have been created yet.'
            }
          </p>
          {canManageTemplates() && (
            <button
              onClick={() => router.push('/maintenance/templates/create')}
              className="px-6 py-3 rounded-lg text-white transition-colors"
              style={{ backgroundColor: '#2697FF' }}
            >
              Create Template
            </button>
          )}
        </div>
      )}
    </div>
  );
}
