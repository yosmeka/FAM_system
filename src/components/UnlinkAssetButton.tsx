import { useState } from 'react';
import { toast } from 'react-hot-toast';

interface UnlinkAssetButtonProps {
  assetId: string;
  linkId: string;
  linkedAssetName: string;
  onSuccess: () => void;
}

export function UnlinkAssetButton({ assetId, linkId, linkedAssetName, onSuccess }: UnlinkAssetButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleUnlink = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/assets/${assetId}/link/${linkId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      toast.success('Asset unlinked successfully');
      onSuccess();
      setShowConfirm(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to unlink asset');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        className="flex items-center text-red-600 hover:text-red-800 font-medium"
        onClick={() => setShowConfirm(true)}
        type="button"
      >
        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
        Unlink
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => !isLoading && setShowConfirm(false)}
          ></div>
          <div className="relative bg-white rounded-lg shadow-lg p-6 w-full max-w-md mx-4 z-10">
            <h3 className="text-lg font-semibold mb-2">Unlink Asset</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to unlink <strong>{linkedAssetName}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={handleUnlink}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                type="button"
              >
                {isLoading ? 'Unlinking...' : 'Unlink'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
