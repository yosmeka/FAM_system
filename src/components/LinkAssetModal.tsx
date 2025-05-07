import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Asset } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LinkAssetModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentAssetId: string;
  availableAssets: Asset[];
}

export function LinkAssetModal({ open, onClose, onSuccess, currentAssetId, availableAssets }: LinkAssetModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const filteredAssets = availableAssets.filter(
    (asset) =>
      asset.id !== currentAssetId &&
      (asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleLinkAsset = async (toAssetId: string) => {
    try {
      console.log("DEBUGGING - Linking asset");
      console.log("DEBUGGING - Current asset ID:", currentAssetId);
      console.log("DEBUGGING - Target asset ID:", toAssetId);

      setIsLoading(true);
      const response = await fetch(`/api/assets/${currentAssetId}/link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ toAssetId }),
      });

      console.log("DEBUGGING - Link response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("DEBUGGING - Link error:", errorText);
        throw new Error(errorText);
      }

      const data = await response.json();
      console.log("DEBUGGING - Link success response:", data);

      toast.success('Asset linked successfully');

      // Call onSuccess to refresh the parent component
      console.log("DEBUGGING - Calling onSuccess to refresh data");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("DEBUGGING - Link error:", error);
      toast.error(error instanceof Error ? error.message : 'Failed to link asset');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white rounded-lg shadow-lg">
        <DialogHeader className="border-b pb-4 mb-4">
          <DialogTitle className="text-xl font-bold text-gray-900">Link Child Asset</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="search" className="text-sm font-medium text-gray-700">Search Assets</Label>
            <Input
              id="search"
              placeholder="Search by name or serial number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div className="border rounded-md shadow-sm">
            <ScrollArea className="h-[400px] p-4">
              <div className="space-y-4">
                {filteredAssets.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No assets found</p>
                ) : (
                  filteredAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className="flex items-center justify-between rounded-lg border p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <h3 className="font-medium text-gray-900">{asset.name}</h3>
                        <p className="text-sm text-gray-500">
                          Serial: {asset.serialNumber} {asset.type && `| Type: ${asset.type}`}
                        </p>
                        <p className="text-sm text-gray-500">
                          Value: {asset.purchasePrice.toLocaleString('en-US', {
                            style: 'currency',
                            currency: 'ETB',
                          })}
                        </p>
                      </div>
                      <Button
                        onClick={() => handleLinkAsset(asset.id)}
                        disabled={isLoading}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md"
                      >
                        {isLoading ? 'Linking...' : 'Link'}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
