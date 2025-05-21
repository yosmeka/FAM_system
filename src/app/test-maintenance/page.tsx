'use client';

import { useState, useEffect } from 'react';

export default function TestMaintenancePage() {
  const [maintenanceRecords, setMaintenanceRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assetId, setAssetId] = useState('cmaqsvtla0000wicgrts2f86q'); // Default to the asset ID we know exists

  // Get assetId from URL query parameter if available
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlAssetId = urlParams.get('assetId');
      if (urlAssetId) {
        setAssetId(urlAssetId);
      }
    }
  }, []);

  const fetchMaintenanceRecords = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log("Fetching maintenance records for asset:", assetId);

      const response = await fetch(`/api/test/maintenance?assetId=${assetId}`);

      console.log("Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);
        setError(`Failed to fetch maintenance records: ${response.status} ${errorText}`);
        return;
      }

      const data = await response.json();
      console.log("Received data:", data);
      setMaintenanceRecords(data);
    } catch (error) {
      console.error('Error fetching maintenance records:', error);
      setError('Failed to fetch maintenance records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMaintenanceRecords();
  }, [assetId]);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Test Maintenance Records</h1>

      <div className="mb-4">
        <label htmlFor="assetId" className="block text-sm font-medium mb-1">Asset ID:</label>
        <div className="flex">
          <input
            type="text"
            id="assetId"
            value={assetId}
            onChange={(e) => setAssetId(e.target.value)}
            className="flex-1 p-2 border rounded-l"
          />
          <button
            onClick={fetchMaintenanceRecords}
            className="bg-blue-600 text-white px-4 py-2 rounded-r"
          >
            Fetch
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
          <p className="mt-2 text-gray-600">Loading maintenance records...</p>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
        </div>
      ) : maintenanceRecords.length > 0 ? (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {maintenanceRecords.map((record) => (
                <tr key={record.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.status}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.priority}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(record.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900">No Maintenance Records</h3>
          <p className="mt-2 text-sm text-gray-500">
            No maintenance records found for this asset.
          </p>
        </div>
      )}
    </div>
  );
}
