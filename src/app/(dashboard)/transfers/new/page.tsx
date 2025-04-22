'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RoleBasedForm } from '@/components/ui/RoleBasedForm';
import { RoleBasedButton } from '@/components/ui/RoleBasedButton';
import { toast } from 'react-hot-toast';

export default function NewTransferPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (formData: FormData) => {
    try {
      setLoading(true);
      const data = {
        assetId: formData.get('assetId'),
        fromLocation: formData.get('fromLocation'),
        toLocation: formData.get('toLocation'),
        reason: formData.get('reason'),
      };

      const response = await fetch('/api/transfers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create transfer');
      }

      toast.success('Transfer request created successfully');
      router.push('/transfers');
      router.refresh();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to create transfer request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold mb-6">New Transfer Request</h1>
        
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
              <label htmlFor="fromLocation" className="block text-sm font-medium">
                From Location
              </label>
              <input
                type="text"
                id="fromLocation"
                name="fromLocation"
                className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                required
              />
            </div>

            <div>
              <label htmlFor="toLocation" className="block text-sm font-medium">
                To Location
              </label>
              <input
                type="text"
                id="toLocation"
                name="toLocation"
                className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                required
              />
            </div>

            <div>
              <label htmlFor="reason" className="block text-sm font-medium">
                Reason
              </label>
              <textarea
                id="reason"
                name="reason"
                rows={3}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                required
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
                loading={loading}
              >
                Create Transfer
              </RoleBasedButton>
            </div>
          </div>
        </RoleBasedForm>
      </div>
    </div>
  );
}
