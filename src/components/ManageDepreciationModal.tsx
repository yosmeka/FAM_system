import React, { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface ManageDepreciationModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (settings: DepreciationSettings) => void;
  initialSettings: DepreciationSettings;
  assetId: string;
}

export interface DepreciationSettings {
  isDepreciable: boolean;
  depreciableCost: number;
  salvageValue: number;
  usefulLifeMonths: number;
  depreciationMethod: string;
  dateAcquired: string;
}

export function ManageDepreciationModal({
  open,
  onClose,
  onSave,
  initialSettings,
  assetId
}: ManageDepreciationModalProps) {
  const [settings, setSettings] = useState<DepreciationSettings>(initialSettings);

  useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      setSettings({
        ...settings,
        [name]: checkbox.checked
      });
    } else if (type === 'number') {
      setSettings({
        ...settings,
        [name]: parseFloat(value)
      });
    } else {
      setSettings({
        ...settings,
        [name]: value
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(settings);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 text-white rounded-lg shadow-lg w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X size={24} />
        </button>
        
        <h2 className="text-xl font-bold mb-6">Manage Asset Depreciation</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="flex items-center justify-between mb-2">
              <span>Depreciable Asset</span>
              <div className="flex items-center space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="isDepreciable"
                    checked={settings.isDepreciable}
                    onChange={() => setSettings({...settings, isDepreciable: true})}
                    className="form-radio h-5 w-5 text-yellow-500"
                  />
                  <span className="ml-2">Yes</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="isDepreciable"
                    checked={!settings.isDepreciable}
                    onChange={() => setSettings({...settings, isDepreciable: false})}
                    className="form-radio h-5 w-5 text-gray-400"
                  />
                  <span className="ml-2">No</span>
                </label>
              </div>
            </label>
          </div>
          
          {settings.isDepreciable && (
            <>
              <div className="mb-6">
                <label className="block mb-2">Depreciable Cost</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-700 bg-gray-800 text-gray-400">
                    $
                  </span>
                  <input
                    type="number"
                    name="depreciableCost"
                    value={settings.depreciableCost}
                    onChange={handleChange}
                    className="flex-1 rounded-r-md bg-gray-800 border border-gray-700 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    min="0"
                    step="0.01"
                  />
                </div>
                <p className="text-sm text-gray-400 mt-1">including sales tax, freight and installation</p>
              </div>
              
              <div className="mb-6">
                <label className="block mb-2">Salvage Value</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-700 bg-gray-800 text-gray-400">
                    $
                  </span>
                  <input
                    type="number"
                    name="salvageValue"
                    value={settings.salvageValue}
                    onChange={handleChange}
                    className="flex-1 rounded-r-md bg-gray-800 border border-gray-700 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block mb-2">Asset Life (months)</label>
                <input
                  type="number"
                  name="usefulLifeMonths"
                  value={settings.usefulLifeMonths}
                  onChange={handleChange}
                  className="w-full rounded-md bg-gray-800 border border-gray-700 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  min="1"
                />
              </div>
              
              <div className="mb-6">
                <label className="block mb-2">Depreciation Method</label>
                <select
                  name="depreciationMethod"
                  value={settings.depreciationMethod}
                  onChange={handleChange}
                  className="w-full rounded-md bg-gray-800 border border-gray-700 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="STRAIGHT_LINE">Straight Line</option>
                  <option value="DECLINING_BALANCE">Declining Balance</option>
                  <option value="DOUBLE_DECLINING">Double Declining</option>
                </select>
              </div>
              
              <div className="mb-6">
                <label className="block mb-2">Date Acquired</label>
                <div className="relative">
                  <input
                    type="date"
                    name="dateAcquired"
                    value={settings.dateAcquired}
                    onChange={handleChange}
                    className="w-full rounded-md bg-gray-800 border border-gray-700 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <Calendar size={20} className="text-gray-400" />
                  </div>
                </div>
              </div>
            </>
          )}
          
          <div className="flex justify-end space-x-4 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-yellow-500 text-black font-medium rounded-md hover:bg-yellow-400 transition-colors"
            >
              Update
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
