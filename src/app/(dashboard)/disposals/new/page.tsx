'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RoleBasedForm } from '@/components/ui/RoleBasedForm';
import { RoleBasedButton } from '@/components/ui/RoleBasedButton';
import { toast } from 'react-hot-toast';

const DISPOSAL_METHODS = [
  'SALE',
  'DONATION',
  'RECYCLING',
  'SCRAPPING',
  'TRADE_IN',
];

export default function NewDisposalPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (formData: FormData) => {
    try {
      setLoading(true);
      const data = {
        assetId: formData.get('assetId'),
        reason: formData.get('reason'),
        method: formData.get('method'),
        proceeds: formData.get('proceeds'),
      };

      const response = await fetch('/api/disposals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create disposal request');
      }

      toast.success('Disposal request created successfully');
      router.push('/disposals');
      router.refresh();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to create disposal request');
    } finally {
      setLoading(false);
    }
  };

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
                {/* We'll fetch and populate assets here */}
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
              <label htmlFor="proceeds" className="block text-sm font-medium">
                Expected Proceeds (if applicable)
              </label>
              <input
                type="number"
                id="proceeds"
                name="proceeds"
                step="0.01"
                min="0"
                className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                placeholder="Enter amount if selling or trading in"
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
