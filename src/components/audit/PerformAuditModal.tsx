'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { X, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface Asset {
  id: string;
  name: string;
  serialNumber: string;
  department: string;
  category: string;
  location: string;
}

interface PerformAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  assignmentId?: string;
  requestId?: string;
  asset: Asset;
  title: string;
  instructions?: string;
}

export default function PerformAuditModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  assignmentId, 
  requestId, 
  asset, 
  title, 
  instructions 
}: PerformAuditModalProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    condition: 'GOOD' as 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL',
    locationVerified: true,
    actualLocation: asset.location,
    notes: '',
    discrepancies: '',
    recommendations: '',
    photos: [] as string[],
    checklistItems: [] as Array<{
      item: string;
      checked: boolean;
      notes?: string;
    }>,
  });

  const defaultChecklist = [
    'Asset is present at recorded location',
    'Asset is in working condition',
    'Asset serial number matches records',
    'Asset shows no signs of damage',
    'Asset is being used appropriately',
    'Asset documentation is complete',
  ];

  useEffect(() => {
    if (isOpen) {
      // Initialize checklist
      setFormData(prev => ({
        ...prev,
        checklistItems: defaultChecklist.map(item => ({
          item,
          checked: false,
          notes: '',
        })),
      }));
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const auditData = {
        assetId: asset.id,
        assignmentId,
        requestId,
        auditDate: new Date().toISOString(),
        condition: formData.condition,
        locationVerified: formData.locationVerified,
        actualLocation: formData.actualLocation,
        notes: formData.notes,
        discrepancies: formData.discrepancies || undefined,
        recommendations: formData.recommendations || undefined,
        checklistItems: formData.checklistItems,
        photos: formData.photos,
        status: 'COMPLETED',
        workflowStatus: 'PENDING_REVIEW',
      };

      const response = await fetch('/api/audits/workflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(auditData),
      });

      if (response.ok) {
        toast.success('Audit completed and submitted for review!');
        onSuccess();
        onClose();
        resetForm();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to submit audit');
      }
    } catch (error) {
      console.error('Error submitting audit:', error);
      toast.error('Failed to submit audit');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      condition: 'GOOD',
      locationVerified: true,
      actualLocation: asset.location,
      notes: '',
      discrepancies: '',
      recommendations: '',
      photos: [],
      checklistItems: [],
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleChecklistChange = (index: number, field: 'checked' | 'notes', value: boolean | string) => {
    setFormData(prev => ({
      ...prev,
      checklistItems: prev.checklistItems.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'EXCELLENT':
        return 'text-green-600';
      case 'GOOD':
        return 'text-green-500';
      case 'FAIR':
        return 'text-yellow-500';
      case 'POOR':
        return 'text-orange-500';
      case 'CRITICAL':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-600">
          <div>
            <h2 className="text-xl font-semibold dark:text-white">Perform Audit</h2>
            <p className="text-gray-400 dark:text-gray-300">{title}</p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-red-500 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Asset Information */}
          <div className="p-4 dark:bg-gray-700 rounded-md">
            <h3 className="text-lg font-medium dark:text-white mb-3">Asset Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-700 dark:text-gray-300">Name:</span>
                <span className="text-gray-600 dark:text-gray-200 ml-2">{asset.name}</span>
              </div>
              <div>
                <span className="text-gray-700 dark:text-gray-300">Serial:</span>
                <span className="text-gray-600 dark:text-gray-200 ml-2">{asset.serialNumber}</span>
              </div>
              <div>
                <span className="text-gray-700 dark:text-gray-300">Department:</span>
                <span className="text-gray-600 dark:text-gray-200 ml-2">{asset.department}</span>
              </div>
              <div>
                <span className="text-gray-700 dark:text-gray-300">Category:</span>
                <span className="text-gray-600 dark:text-gray-200 ml-2">{asset.category}</span>
              </div>
            </div>
          </div>

          {/* Instructions */}
          {instructions && (
            <div className="p-4 dark:bg-blue-900 bg-opacity-50 border border-blue-600 rounded-md">
              <h3 className="text-lg font-medium dark:text-blue-200 text-blue-600 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Instructions
              </h3>
              <p className="dark:text-blue-100 text-blue-600 whitespace-pre-wrap">{instructions}</p>
            </div>
          )}

          {/* Audit Checklist */}
          <div>
            <h3 className="text-lg font-medium dark:text-white mb-4">Audit Checklist</h3>
            <div className="space-y-3">
              {formData.checklistItems.map((item, index) => (
                <div key={index} className="p-3 dark:bg-gray-700 rounded-md">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={(e) => handleChecklistChange(index, 'checked', e.target.checked)}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="flex-1">
                      <label className="text-gray-700 dark:text-white font-medium">{item.item}</label>
                      <input
                        type="text"
                        placeholder="Add notes (optional)"
                        value={item.notes || ''}
                        onChange={(e) => handleChecklistChange(index, 'notes', e.target.value)}
                        className="mt-2 w-full px-3 py-1 text-sm border border-gray-600 rounded-md dark:bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Asset Condition */}
          <div>
            <label className="block text-sm font-medium dark:text-gray-700 text-gray-600 mb-2">
              Asset Condition *
            </label>
            <select
              value={formData.condition}
              onChange={(e) => setFormData({ ...formData, condition: e.target.value as any })}
              required
              className={`w-full px-3 py-2 border border-gray-600 rounded-md dark:bg-gray-700 bg-gray-100 text-gray-300 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${getConditionColor(formData.condition)}`}
            >
              <option value="EXCELLENT">Excellent</option>
              <option value="GOOD">Good</option>
              <option value="FAIR">Fair</option>
              <option value="POOR">Poor</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          {/* Location Verification */}
          <div>
            {/* <div className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                id="locationVerified"
                checked={formData.locationVerified}
                onChange={(e) => setFormData({ ...formData, locationVerified: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="locationVerified" className="text-white font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Asset found at recorded location
              </label>
            </div> */}
            
            {!formData.locationVerified && (
              <div>
                <label className="block text-sm font-medium dark:text-white mb-2">
                  Actual Location *
                </label>
                <input
                  type="text"
                  value={formData.actualLocation}
                  onChange={(e) => setFormData({ ...formData, actualLocation: e.target.value })}
                  required={!formData.locationVerified}
                  placeholder="Where was the asset actually found?"
                  className="w-full px-3 py-2 border border-gray-600 rounded-md dark:bg-gray-700 bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Audit Notes */}
          <div>
            <label className="block text-sm font-medium dark:text-white mb-2">
              Audit Notes *
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              required
              rows={4}
              placeholder="Describe your findings, observations, and any issues discovered..."
              className="w-full px-3 py-2 border border-gray-600 rounded-md dark:bg-gray-700 bg-gray-100 text-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Discrepancies */}
          <div>
            <label className="block text-sm font-medium dark:text-white mb-2">
              Discrepancies Found
            </label>
            <textarea
              value={formData.discrepancies}
              onChange={(e) => setFormData({ ...formData, discrepancies: e.target.value })}
              rows={3}
              placeholder="List any discrepancies between records and actual findings..."
              className="w-full px-3 py-2 border border-gray-600 rounded-md dark:bg-gray-700 bg-gray-100 text-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Recommendations */}
          <div>
            <label className="block text-sm font-medium dark:text-white mb-2">
              Recommendations
            </label>
            <textarea
              value={formData.recommendations}
              onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
              rows={3}
              placeholder="Provide recommendations for maintenance, repairs, or other actions..."
              className="w-full px-3 py-2 border border-gray-600 rounded-md dark:bg-gray-700 bg-gray-100 text-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Photo Upload Placeholder */}
          {/* <div>
            <label className="block text-sm font-medium  dark:text-white mb-2">
              Photos (Optional)
            </label>
            <div className="border-2 border-dashed border-gray-600 rounded-md p-6 text-center">
              <Camera className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-400">Photo upload functionality coming soon</p>
              <p className="text-xs text-gray-500">For now, please include photo descriptions in notes</p>
            </div>
          </div> */}

          {/* Submit Actions */}
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
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Submit Audit for Review
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      <ToastContainer />
    </div>
  );
}
