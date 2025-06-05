'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RoleBasedForm } from '@/components/ui/RoleBasedForm';
import { RoleBasedButton } from '@/components/ui/RoleBasedButton';
import { toast } from 'react-hot-toast';
import { useSession } from 'next-auth/react';

const DISPOSAL_METHODS = [
  'SALE',
  'DONATION',
  'RECYCLE',
  'SCRAP'
];

interface Asset {
  id: string;
  name: string;
  serialNumber: string;
  currentValue: number;
  status: string;
}

export default function NewDisposalPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);







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







  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.replace('/dashboard');
      toast.error('Access denied: Please log in to create disposal requests.');
      return;
    }

    // Fetch available assets
    fetchAssets();
  }, [session, status, router]);

  const fetchAssets = async () => {
    try {
      const response = await fetch('/api/assets');
      if (!response.ok) throw new Error('Failed to fetch assets');
      const data = await response.json();
      // Filter out already disposed assets
      setAssets(data.filter((asset: Asset) => asset.status !== 'DISPOSED'));
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load assets');
    }
  };

  const handleSubmit = async (formData: FormData) => {
    try {
      setLoading(true);
      const data = {
        assetId: formData.get('assetId'),
        reason: formData.get('reason'),
        method: formData.get('method'),
        proceeds: formData.get('expectedValue'),
      };

      const response = await fetch('/api/disposals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create disposal request');
      }

      toast.success('Disposal request created successfully');
      router.push('/disposals');
      router.refresh();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to create disposal request');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') return null;
  if (!session) return null;

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold mb-6">New Disposal Request</h1>
        
        <RoleBasedForm onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="assetId" className="block text-sm font-medium">
                Asset
              </label>
              <select
                id="assetId"
                name="assetId"
                className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                required
              >
                <option value="">Select Asset</option>
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name} ({asset.serialNumber}) - Current Value: ${asset.currentValue}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="method" className="block text-sm font-medium">
                Disposal Method
              </label>
              <select
                id="method"
                name="method"
                className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                required
              >
                <option value="">Select Method</option>
                {DISPOSAL_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="reason" className="block text-sm font-medium">
                Reason for Disposal
              </label>
              <textarea
                id="reason"
                name="reason"
                rows={3}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                placeholder="Explain why this asset needs to be disposed..."
                required
              />
            </div>

            <div>
              <label htmlFor="expectedValue" className="block text-sm font-medium">
                Expected Value (if applicable)
              </label>
              <input
                type="number"
                id="expectedValue"
                name="expectedValue"
                step="0.01"
                min="0"
                className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                placeholder="Enter expected value if selling or trading in"
              />
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <RoleBasedButton
                type="button"
                variant="secondary"
                onClick={() => router.back()}
              >
                Cancel
              </RoleBasedButton>
              <RoleBasedButton
                type="submit"
                variant="primary"
                className="bg-red-600 hover:bg-red-700 text-white"
                loading={loading}
              >
                Submit Request
              </RoleBasedButton>
            </div>
          </div>
        </RoleBasedForm>
      </div>
    </div>
  );
}
