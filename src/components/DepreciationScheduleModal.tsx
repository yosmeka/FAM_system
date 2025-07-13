import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface DepreciationScheduleModalProps {
  open: boolean;
  onClose: () => void;
  assetId: string;
  assetName: string;
}

interface ScheduleRow {
  year: number;
  month: number;
  depreciationExpense: number;
  accumulatedDepreciation: number;
  bookValue: number;
}

export function DepreciationScheduleModal({ open, onClose, assetId, assetName }: DepreciationScheduleModalProps) {
  const [schedule, setSchedule] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    fetch(`/api/reports/assets/${assetId}/schedule`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch schedule');
        return res.json();
      })
      .then(data => setSchedule(data.schedule || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [open, assetId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black bg-opacity-30" onClick={onClose}></div>
        {/* Modal */}
        <div className="relative z-10 w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
          {/* Close button */}
          <div className="absolute right-0 top-0 pr-4 pt-4">
            <button
              type="button"
              className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <X className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          {/* Content */}
          <div>
            <h3 className="text-lg font-semibold leading-6 text-gray-900 mb-4">
              Depreciation Schedule for {assetName}
            </h3>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : error ? (
              <div className="text-center text-red-500 py-8">{error}</div>
            ) : (
              <div className="overflow-x-auto max-h-[60vh]">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Year</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Month</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Depreciation</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Accumulated</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Book Value</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {schedule.map((row, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2">{row.year}</td>
                        <td className="px-4 py-2">{row.month}</td>
                        <td className="px-4 py-2">{row.depreciationExpense.toFixed(2)}</td>
                        <td className="px-4 py-2">{row.accumulatedDepreciation.toFixed(2)}</td>
                        <td className="px-4 py-2">{row.bookValue.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 