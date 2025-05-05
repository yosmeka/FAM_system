import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface UnlinkAssetButtonProps {
  assetId: string;
  linkId: string;
  linkedAssetName: string;
  onSuccess: () => void;
}

export function UnlinkAssetButton({ assetId, linkId, linkedAssetName, onSuccess }: UnlinkAssetButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
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
      setIsOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to unlink asset');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        className="flex items-center text-red-600 hover:text-red-800 font-medium"
        onClick={() => setIsOpen(true)}
      >
        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
        Unlink
      </button>

      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink Asset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unlink <strong>{linkedAssetName}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleUnlink();
              }}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isLoading ? 'Unlinking...' : 'Unlink'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
