'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { RoleBasedButton } from '@/components/ui/RoleBasedButton';
import { toast } from 'react-hot-toast';
import { useSession } from 'next-auth/react';

interface DisposalDetails {
  id: string;
  assetId: string;
  method: string;
  reason: string;
  status: string;
  expectedValue: number;
  actualValue: number | null;
  createdAt: string;
  asset?: {
    name: string;
    serialNumber: string;
    status?: string;
    currentValue?: number;
  };
  requester?: {
    name?: string;
    email?: string;
    id?: string;
  };
}

export default function EditDisposalPage() {
  const [redirecting, setRedirecting] = useState(false);
  const params = useParams() as { id: string };
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [disposal, setDisposal] = useState<DisposalDetails | null>(null);
  const [method, setMethod] = useState('');
  const [reason, setReason] = useState('');
  const [expectedValue, setExpectedValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDisposal = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/disposals/${params.id}`);
        if (!response.ok) throw new Error('Failed to fetch disposal');
        const data = await response.json();
        setDisposal(data);
        setMethod(data.method || '');
        setReason(data.reason || '');
        setExpectedValue(data.expectedValue?.toString() || '');
      } catch (err: any) {
        setError(err.message || 'Failed to fetch disposal');
      } finally {
        setLoading(false);
      }
    };
    fetchDisposal();
  }, [params.id]);

  if (redirecting) return <div>Redirecting...</div>;
  if (status === 'loading' || loading){
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
      </div>
    );
  }
  if (error) return <div className="text-red-600">{error}</div>;
  if (!disposal) return <div>Disposal not found</div>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`/api/disposals/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method,
          reason,
          expectedValue: parseFloat(expectedValue),
        }),
      });
      if (!response.ok) throw new Error('Failed to update disposal');
      toast.success('Disposal updated successfully');
      setRedirecting(true);
      router.push('/disposals');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update disposal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold mb-6">Edit Disposal Request</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Asset</label>
            <div className="bg-gray-100 dark:bg-gray-800 rounded p-2 mt-1">
              <div><b>Name:</b> {disposal.asset?.name}</div>
              <div><b>Serial Number:</b> {disposal.asset?.serialNumber}</div>
              {disposal.asset?.currentValue !== undefined && (
                <div><b>Current Value:</b> ${disposal.asset.currentValue?.toLocaleString?.() ?? disposal.asset.currentValue}</div>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="method" className="block text-sm font-medium">Disposal Method</label>
            <select
              id="method"
              name="method"
              className="mt-1 block w-full rounded-md border border-gray-300 dark:bg-gray-800 p-2"
              required
              value={method}
              onChange={e => setMethod(e.target.value)}
            >
              <option value="">Select Method</option>
              <option value="SALE">Sale</option>
              <option value="DONATION">Donation</option>
              <option value="RECYCLE">Recycle</option>
              <option value="SCRAP">Scrap</option>
            </select>
          </div>

          <div>
            <label htmlFor="expectedValue" className="block text-sm font-medium">Expected Value</label>
            <input
              type="number"
              id="expectedValue"
              name="expectedValue"
              step="0.01"
              min="0"
              className="mt-1 block w-full rounded-md border border-gray-300 dark:bg-gray-800 p-2"
              required
              value={expectedValue}
              onChange={e => setExpectedValue(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="reason" className="block text-sm font-medium">Reason</label>
            <textarea
              id="reason"
              name="reason"
              rows={3}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:bg-gray-800 p-2"
              required
              value={reason}
              onChange={e => setReason(e.target.value)}
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
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </RoleBasedButton>
          </div>
        </form>
      </div>
    </div>
  );
} 