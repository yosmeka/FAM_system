'use client';

import { useState, useEffect } from 'react';

export default function TestLinkedAssetsPage() {
  const [linkedAssets, setLinkedAssets] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/test/linked-assets');
        if (!response.ok) {
          throw new Error('Failed to fetch linked assets');
        }
        const data = await response.json();
        console.log('Linked assets data:', data);
        setLinkedAssets(data.linkedAssets || []);
        setAssets(data.assets || []);
      } catch (err) {
        console.error('Error:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Linked Assets Test Page</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">All Assets ({assets.length})</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-2 px-4 border">ID</th>
                <th className="py-2 px-4 border">Name</th>
                <th className="py-2 px-4 border">Serial Number</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset.id}>
                  <td className="py-2 px-4 border">{asset.id}</td>
                  <td className="py-2 px-4 border">{asset.name}</td>
                  <td className="py-2 px-4 border">{asset.serialNumber}</td>
                </tr>
              ))}
              {assets.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-4 text-center">No assets found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div>
        <h2 className="text-xl font-semibold mb-4">Linked Assets ({linkedAssets.length})</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-2 px-4 border">Link ID</th>
                <th className="py-2 px-4 border">Parent Asset</th>
                <th className="py-2 px-4 border">Parent Serial</th>
                <th className="py-2 px-4 border">Child Asset</th>
                <th className="py-2 px-4 border">Child Serial</th>
                <th className="py-2 px-4 border">Created At</th>
              </tr>
            </thead>
            <tbody>
              {linkedAssets.map((link) => (
                <tr key={link.id}>
                  <td className="py-2 px-4 border">{link.id}</td>
                  <td className="py-2 px-4 border">{link.fromAsset.name}</td>
                  <td className="py-2 px-4 border">{link.fromAsset.serialNumber}</td>
                  <td className="py-2 px-4 border">{link.toAsset.name}</td>
                  <td className="py-2 px-4 border">{link.toAsset.serialNumber}</td>
                  <td className="py-2 px-4 border">{new Date(link.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {linkedAssets.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center">No linked assets found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Create Test Link</h2>
        <form className="space-y-4" onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const fromAssetId = formData.get('fromAssetId') as string;
          const toAssetId = formData.get('toAssetId') as string;
          
          if (!fromAssetId || !toAssetId) {
            alert('Please select both parent and child assets');
            return;
          }
          
          try {
            const response = await fetch(`/api/assets/${fromAssetId}/link`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ toAssetId }),
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(errorText);
            }
            
            alert('Link created successfully!');
            window.location.reload();
          } catch (error) {
            alert(`Error creating link: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }}>
          <div>
            <label className="block mb-2">Parent Asset:</label>
            <select name="fromAssetId" className="w-full p-2 border rounded">
              <option value="">Select Parent Asset</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name} ({asset.serialNumber})
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block mb-2">Child Asset:</label>
            <select name="toAssetId" className="w-full p-2 border rounded">
              <option value="">Select Child Asset</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name} ({asset.serialNumber})
                </option>
              ))}
            </select>
          </div>
          
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
            Create Link
          </button>
        </form>
      </div>
    </div>
  );
}
