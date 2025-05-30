'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { X, Calendar, User, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Asset {
  id: string;
  name: string;
  serialNumber: string;
  department: string;
  category: string;
}

interface Manager {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface CreateRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateRequestModal({ isOpen, onClose, onSuccess }: CreateRequestModalProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [formData, setFormData] = useState({
    assetId: '',
    managerId: '',
    title: '',
    reason: '',
    urgency: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    requestedDate: '',
    description: '',
    expectedFindings: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchAssets();
      fetchManagers();
    }
  }, [isOpen]);

  const fetchAssets = async () => {
    try {
      const response = await fetch('/api/assets');
      if (response.ok) {
        const data = await response.json();
        setAssets(data);
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
    }
  };

  const fetchManagers = async () => {
    try {
      const response = await fetch('/api/users/managers');
      if (response.ok) {
        const data = await response.json();
        setManagers(data);
      } else {
        console.error('Failed to fetch managers:', response.status);
        toast.error('Failed to load managers');
      }
    } catch (error) {
      console.error('Error fetching managers:', error);
      toast.error('Failed to load managers');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/audit-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('Audit request created successfully!');
        onSuccess();
        onClose();
        resetForm();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create request');
      }
    } catch (error) {
      console.error('Error creating request:', error);
      toast.error('Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      assetId: '',
      managerId: '',
      title: '',
      reason: '',
      urgency: 'MEDIUM',
      requestedDate: '',
      description: '',
      expectedFindings: '',
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: '#2A2D3E' }}>
        <div className="flex items-center justify-between p-6 border-b border-gray-600">
          <h2 className="text-xl font-semibold text-white">Request Audit</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Asset Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Asset *
            </label>
            <select
              value={formData.assetId}
              onChange={(e) => setFormData({ ...formData, assetId: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select an asset</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name} ({asset.serialNumber}) - {asset.department}
                </option>
              ))}
            </select>
          </div>

          {/* Manager Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Assign to Manager (Optional)
            </label>
            <select
              value={formData.managerId}
              onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Any available manager</option>
              {managers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.name} ({manager.email})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Leave empty to allow any manager to review this request
            </p>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="e.g., Suspected Damage Inspection"
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Reason for Audit *
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              required
              rows={3}
              placeholder="Explain why this audit is needed..."
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Urgency and Requested Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Urgency
              </label>
              <select
                value={formData.urgency}
                onChange={(e) => setFormData({ ...formData, urgency: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Requested Date *
              </label>
              <input
                type="datetime-local"
                value={formData.requestedDate}
                onChange={(e) => setFormData({ ...formData, requestedDate: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Detailed Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              placeholder="Provide detailed information about the issue or concern..."
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Expected Findings */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Expected Findings
            </label>
            <textarea
              value={formData.expectedFindings}
              onChange={(e) => setFormData({ ...formData, expectedFindings: e.target.value })}
              rows={3}
              placeholder="What do you expect the audit to reveal or confirm?"
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Info Box */}
          <div className="bg-blue-900 bg-opacity-50 border border-blue-600 rounded-md p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-200">
                <p className="font-medium mb-1">Request Process:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Your request will be sent to the selected manager for review</li>
                  <li>If no manager is selected, any available manager can review it</li>
                  <li>Once approved, you can perform the audit</li>
                  <li>The manager will review your audit results</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-600">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-300 bg-gray-600 rounded-md hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
