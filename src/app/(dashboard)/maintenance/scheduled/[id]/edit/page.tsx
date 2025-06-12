'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, X } from 'lucide-react';

interface Asset {
  id: string;
  name: string;
  serialNumber: string;
  location: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface Template {
  id: string;
  name: string;
  maintenanceType: string;
}

interface MaintenanceSchedule {
  id: string;
  title: string;
  description: string;
  frequency: string;
  customInterval?: number;
  priority: string;
  status: string;
  estimatedHours?: number;
  startDate: string;
  endDate?: string;
  leadTimeDays: number;
  autoAssign: boolean;
  assetId: string;
  assignedToId?: string;
  templateId?: string;
}

export default function EditSchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session } = useSession();
  const router = useRouter();
  const resolvedParams = use(params);

  const [schedule, setSchedule] = useState<MaintenanceSchedule | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    frequency: 'MONTHLY',
    customInterval: '',
    priority: 'MEDIUM',
    status: 'ACTIVE',
    estimatedHours: '',
    startDate: '',
    endDate: '',
    leadTimeDays: '7',
    autoAssign: true,
    assetId: '',
    assignedToId: '',
    templateId: '',
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch schedule details
      const scheduleResponse = await fetch(`/api/maintenance-schedules/${resolvedParams.id}`);
      if (!scheduleResponse.ok) throw new Error('Failed to fetch schedule');
      const scheduleData = await scheduleResponse.json();

      setSchedule(scheduleData);

      // Set form data from schedule
      setFormData({
        title: scheduleData.title || '',
        description: scheduleData.description || '',
        frequency: scheduleData.frequency || 'MONTHLY',
        customInterval: scheduleData.customInterval?.toString() || '',
        priority: scheduleData.priority || 'MEDIUM',
        status: scheduleData.status || 'ACTIVE',
        estimatedHours: scheduleData.estimatedHours?.toString() || '',
        startDate: scheduleData.startDate ? new Date(scheduleData.startDate).toISOString().split('T')[0] : '',
        endDate: scheduleData.endDate ? new Date(scheduleData.endDate).toISOString().split('T')[0] : '',
        leadTimeDays: scheduleData.leadTimeDays?.toString() || '7',
        autoAssign: scheduleData.autoAssign ?? true,
        assetId: scheduleData.assetId || '',
        assignedToId: scheduleData.assignedToId || '',
        templateId: scheduleData.templateId || '',
      });

      // Fetch assets
      const assetsResponse = await fetch('/api/assets');
      if (assetsResponse.ok) {
        const assetsData = await assetsResponse.json();
        setAssets(assetsData);
      }

      // Fetch users (technicians)
      const usersResponse = await fetch('/api/users');
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData.filter((user: User) => user.id !== session?.user?.id));
      }

      // Fetch templates
      const templatesResponse = await fetch('/api/maintenance-templates');
      if (templatesResponse.ok) {
        const templatesData = await templatesResponse.json();
        setTemplates(templatesData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to load schedule data');
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.id, session?.user?.id]);

  useEffect(() => {
    if (session?.user?.role !== 'MANAGER' && session?.user?.role !== 'ADMIN') {
      router.push('/maintenance/scheduled');
      return;
    }

    fetchData();
  }, [resolvedParams.id, session, router, fetchData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.assetId) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);

    try {
      const updateData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        frequency: formData.frequency,
        customInterval: formData.customInterval ? parseInt(formData.customInterval) : undefined,
        priority: formData.priority,
        status: formData.status,
        estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : undefined,
        startDate: formData.startDate,
        endDate: formData.endDate || undefined,
        leadTimeDays: parseInt(formData.leadTimeDays),
        autoAssign: formData.autoAssign,
        assignedToId: formData.assignedToId || undefined,
        templateId: formData.templateId || undefined,
      };

      const response = await fetch(`/api/maintenance-schedules/${resolvedParams.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        alert('Schedule updated successfully!');
        router.push(`/maintenance/scheduled/${resolvedParams.id}`);
      } else {
        const errorData = await response.json();
        alert(`Failed to update schedule: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating schedule:', error);
      alert('Failed to update schedule');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#212332' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: '#2697FF' }}></div>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#212332' }}>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Schedule Not Found</h2>
          <p className="text-gray-400 mb-4">The maintenance schedule you are trying to edit does not exist.</p>
          <button
            onClick={() => router.push('/maintenance/scheduled')}
            className="px-4 py-2 rounded-lg text-white transition-colors"
            style={{ backgroundColor: '#2697FF' }}
          >
            Back to Schedules
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#212332' }}>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push(`/maintenance/scheduled/${resolvedParams.id}`)}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Edit Maintenance Schedule</h1>
          <p className="text-gray-400">Modify schedule details and settings</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/maintenance/scheduled/${resolvedParams.id}`)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-300 border border-gray-600 hover:bg-gray-700 transition-colors"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
            style={{ backgroundColor: '#2697FF' }}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="p-6 rounded-lg" style={{ backgroundColor: '#2A2D3E' }}>
              <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="Enter schedule title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="Enter schedule description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Asset *
                  </label>
                  <select
                    name="assetId"
                    value={formData.assetId}
                    onChange={handleInputChange}
                    required
                    disabled // Asset cannot be changed after creation
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed"
                  >
                    <option value="">Select an asset</option>
                    {assets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.name} ({asset.serialNumber}) - {asset.location}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Asset cannot be changed after schedule creation</p>
                </div>
              </div>
            </div>

            {/* Schedule Settings */}
            <div className="p-6 rounded-lg" style={{ backgroundColor: '#2A2D3E' }}>
              <h3 className="text-lg font-semibold text-white mb-4">Schedule Settings</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Frequency
                  </label>
                  <select
                    name="frequency"
                    value={formData.frequency}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="SEMI_ANNUALLY">Semi-Annually</option>
                    <option value="ANNUALLY">Annually</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>

                {formData.frequency === 'CUSTOM' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Custom Interval (days)
                    </label>
                    <input
                      type="number"
                      name="customInterval"
                      value={formData.customInterval}
                      onChange={handleInputChange}
                      min="1"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      placeholder="Enter number of days"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Priority
                    </label>
                    <select
                      name="priority"
                      value={formData.priority}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="PAUSED">Paused</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Assignment */}
            <div className="p-6 rounded-lg" style={{ backgroundColor: '#2A2D3E' }}>
              <h3 className="text-lg font-semibold text-white mb-4">Assignment</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Assigned Technician
                  </label>
                  <select
                    name="assignedToId"
                    value={formData.assignedToId}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select a technician</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Template
                  </label>
                  <select
                    name="templateId"
                    value={formData.templateId}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select a template (optional)</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name} ({template.maintenanceType})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="autoAssign"
                    checked={formData.autoAssign}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <label className="ml-2 text-sm text-gray-300">
                    Auto-assign tasks to this technician
                  </label>
                </div>
              </div>
            </div>

            {/* Timing */}
            <div className="p-6 rounded-lg" style={{ backgroundColor: '#2A2D3E' }}>
              <h3 className="text-lg font-semibold text-white mb-4">Timing</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    End Date (optional)
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Lead Time (days)
                    </label>
                    <input
                      type="number"
                      name="leadTimeDays"
                      value={formData.leadTimeDays}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Estimated Hours
                    </label>
                    <input
                      type="number"
                      name="estimatedHours"
                      value={formData.estimatedHours}
                      onChange={handleInputChange}
                      min="0"
                      step="0.5"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      placeholder="e.g., 2.5"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
