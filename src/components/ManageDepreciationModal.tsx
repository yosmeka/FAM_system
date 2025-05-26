import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface ManageDepreciationModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (settings: DepreciationSettings) => void;
  initialSettings: DepreciationSettings;
}

export interface DepreciationSettings {
  isDepreciable: boolean;
  depreciableCost: number;
  salvageValue: number;
  usefulLifeMonths: number;
  depreciationMethod: string;
  dateAcquired: string;
  totalUnits?: number;
  unitsPerYear?: number[];
}

export function ManageDepreciationModal({
  open,
  onClose,
  onSave,
  initialSettings
}: Omit<ManageDepreciationModalProps, 'assetId'>) {
  const [settings, setSettings] = useState<DepreciationSettings>({
    ...initialSettings,
    totalUnits: initialSettings.totalUnits || 10000,
    unitsPerYear: initialSettings.unitsPerYear || Array(Math.ceil(initialSettings.usefulLifeMonths / 12)).fill(
      (initialSettings.totalUnits || 10000) / Math.ceil(initialSettings.usefulLifeMonths / 12)
    )
  });

  useEffect(() => {
    setSettings({
      ...initialSettings,
      totalUnits: initialSettings.totalUnits || 10000,
      unitsPerYear: initialSettings.unitsPerYear || Array(Math.ceil(initialSettings.usefulLifeMonths / 12)).fill(
        (initialSettings.totalUnits || 10000) / Math.ceil(initialSettings.usefulLifeMonths / 12)
      )
    });
  }, [initialSettings, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    // For number fields, always parse as float
    if (type === 'number') {
      // Only update unitsPerYear if method is UNITS_OF_ACTIVITY and relevant field is changed
      if (name === 'totalUnits' && settings.depreciationMethod === 'UNITS_OF_ACTIVITY') {
        const totalUnits = parseFloat(value);
        const yearsCount = Math.ceil(settings.usefulLifeMonths / 12);
        const unitsPerYear = Array(yearsCount).fill(totalUnits / yearsCount);
        setSettings(prev => ({
          ...prev,
          totalUnits,
          unitsPerYear
        }));
      } else if (name === 'usefulLifeMonths' && settings.depreciationMethod === 'UNITS_OF_ACTIVITY') {
        const months = parseFloat(value);
        const yearsCount = Math.ceil(months / 12);
        const totalUnits = settings.totalUnits || 10000;
        const unitsPerYear = Array(yearsCount).fill(totalUnits / yearsCount);
        setSettings(prev => ({
          ...prev,
          usefulLifeMonths: months,
          unitsPerYear
        }));
      } else {
        // For all other number fields, just update the field
        setSettings(prev => ({
          ...prev,
          [name]: parseFloat(value)
        }));
      }
    } else if (name === 'depreciationMethod') {
      // If changing to Units of Activity, make sure we have default values
      if (value === 'UNITS_OF_ACTIVITY') {
        const totalUnits = settings.totalUnits || 10000;
        const yearsCount = Math.ceil(settings.usefulLifeMonths / 12);
        const unitsPerYear = settings.unitsPerYear || Array(yearsCount).fill(totalUnits / yearsCount);
        setSettings(prev => ({
          ...prev,
          depreciationMethod: value,
          totalUnits,
          unitsPerYear
        }));
      } else {
        setSettings(prev => ({
          ...prev,
          depreciationMethod: value
        }));
      }
    } else if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      setSettings(prev => ({
        ...prev,
        [name]: checkbox.checked
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        [name]: value
      }));
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
                    value={isNaN(settings.depreciableCost) ? '' : settings.depreciableCost}
                    onChange={handleChange}
                    onClick={(e) => e.currentTarget.select()}
                    className="flex-1 rounded-r-md bg-gray-800 border border-gray-700 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
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
                    value={isNaN(settings.salvageValue) ? '' : settings.salvageValue}
                    onChange={handleChange}
                    onClick={(e) => e.currentTarget.select()}
                    className="flex-1 rounded-r-md bg-gray-800 border border-gray-700 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block mb-2">Asset Life (months)</label>
                <input
                  type="number"
                  name="usefulLifeMonths"
                  value={isNaN(settings.usefulLifeMonths) ? '' : settings.usefulLifeMonths}
                  onChange={handleChange}
                  onClick={(e) => e.currentTarget.select()}
                  className="w-full rounded-md bg-gray-800 border border-gray-700 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  min="1"
                  step="1"
                  inputMode="numeric"
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
                  <option value="SUM_OF_YEARS_DIGITS">Sum of Years Digits</option>
                  <option value="UNITS_OF_ACTIVITY">Units of Activity</option>
                </select>
              </div>

              {settings.depreciationMethod === 'UNITS_OF_ACTIVITY' && (
                <>
                  <div className="mb-6">
                    <label className="block mb-2">Total Units</label>
                    <input
                      type="number"
                      name="totalUnits"
                      value={settings.totalUnits || 10000}
                      onChange={handleChange}
                      onClick={(e) => e.currentTarget.select()}
                      className="w-full rounded-md bg-gray-800 border border-gray-700 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      min="1"
                    />
                    <p className="text-sm text-gray-400 mt-1">Total units the asset is expected to produce over its lifetime</p>
                  </div>

                  <div className="mb-6">
                    <label className="block mb-2">Units Per Year</label>
                    <div className="space-y-2 max-h-40 overflow-y-auto p-2 border border-gray-700 rounded-md">
                      {(settings.unitsPerYear || []).map((units, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <span className="text-sm text-gray-400 w-16">Year {index + 1}:</span>
                          <input
                            type="number"
                            value={units}
                            onChange={(e) => {
                              const newUnitsPerYear = [...(settings.unitsPerYear || [])];
                              newUnitsPerYear[index] = parseFloat(e.target.value);
                              setSettings({
                                ...settings,
                                unitsPerYear: newUnitsPerYear
                              });
                            }}
                            onClick={(e) => e.currentTarget.select()}
                            className="flex-1 rounded-md bg-gray-800 border border-gray-700 text-white px-3 py-1 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                            min="0"
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-gray-400 mt-1">Estimated units to be used each year</p>
                  </div>
                </>
              )}

              <div className="mb-6">
                <label className="block mb-2">Date Acquired</label>
                <input
                  type="date"
                  name="dateAcquired"
                  value={settings.dateAcquired}
                  onChange={handleChange}
                  className="w-full rounded-md bg-gray-800 border border-gray-700 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
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
