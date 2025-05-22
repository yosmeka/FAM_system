'use client';

import { useState, useEffect } from 'react';

export default function TestMaintenancePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [maintenanceData, setMaintenanceData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/test-maintenance');
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Maintenance data:', data);
        setMaintenanceData(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching maintenance data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Test Maintenance Data</h1>
        <div className="p-4 text-center">Loading maintenance data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Test Maintenance Data</h1>
        <div className="p-4 text-center text-red-600">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Test Maintenance Data</h1>
      
      <div className="mb-4 p-4 bg-blue-50 rounded">
        <p><strong>Total Records:</strong> {maintenanceData?.totalCount || 0}</p>
        <p><strong>Records Fetched:</strong> {maintenanceData?.count || 0}</p>
      </div>
      
      {maintenanceData?.data && maintenanceData.data.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 border">ID</th>
                <th className="px-4 py-2 border">Asset</th>
                <th className="px-4 py-2 border">Description</th>
                <th className="px-4 py-2 border">Status</th>
                <th className="px-4 py-2 border">Priority</th>
                <th className="px-4 py-2 border">Cost</th>
                <th className="px-4 py-2 border">Created At</th>
                <th className="px-4 py-2 border">Requester</th>
              </tr>
            </thead>
            <tbody>
              {maintenanceData.data.map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border">{item.id.substring(0, 8)}...</td>
                  <td className="px-4 py-2 border">{item.asset?.name || 'Unknown'}</td>
                  <td className="px-4 py-2 border">{item.description}</td>
                  <td className="px-4 py-2 border">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      item.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                      item.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                      item.status === 'PENDING_APPROVAL' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {item.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-2 border">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      item.priority === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                      item.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                      item.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {item.priority}
                    </span>
                  </td>
                  <td className="px-4 py-2 border">{item.cost ? `$${item.cost.toFixed(2)}` : 'N/A'}</td>
                  <td className="px-4 py-2 border">{new Date(item.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-2 border">{item.requester?.name || 'Unknown'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-4 text-center">No maintenance data found</div>
      )}
    </div>
  );
}
