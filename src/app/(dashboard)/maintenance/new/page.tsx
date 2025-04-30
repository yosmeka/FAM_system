'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RoleBasedForm } from '@/components/ui/RoleBasedForm';
import { RoleBasedButton } from '@/components/ui/RoleBasedButton';
import { toast } from 'react-hot-toast';

import { useSession } from 'next-auth/react';

export default function NewMaintenanceRequestPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === 'loading') return null;
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
    if (typeof window !== 'undefined') {
      router.replace('/dashboard');
      toast.error('Access denied: Only Admins and Managers can create maintenance requests.');
    }
    return null;
  }

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    try {
      setLoading(true);
      const data = {
        assetId: formData.get('assetId'),
        description: formData.get('description'),
        // In a real app, you'd get this from the session/auth context
        requestedById: 'user-id',
      };

      const response = await fetch('/api/maintenance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create maintenance request');
      }

      toast.success('Maintenance request created successfully');
      router.push('/maintenance');
      router.refresh();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to create maintenance request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold mb-6">New Maintenance Request</h1>
        
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
              <label htmlFor="description" className="block text-sm font-medium">
                Description of Issue
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                placeholder="Describe the maintenance issue..."
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
                className="bg-red-600 hover:bg-red-700 text-white"
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
