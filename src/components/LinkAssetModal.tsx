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
      setIsLoading(true);
      const response = await fetch(`/api/assets/${currentAssetId}/link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ toAssetId }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      toast.success('Asset linked successfully');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to link asset');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Link Asset</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="search">Search Assets</Label>
            <Input
              id="search"
              placeholder="Search by name or serial number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <ScrollArea className="h-[400px] rounded-md border p-4">
            <div className="space-y-4">
              {filteredAssets.length === 0 ? (
                <p className="text-center text-gray-500">No assets found</p>
              ) : (
                filteredAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between rounded-lg border p-4 hover:bg-gray-50"
                  >
                    <div>
                      <h3 className="font-medium">{asset.name}</h3>
                      <p className="text-sm text-gray-500">
                        Serial: {asset.serialNumber} | Type: {asset.type}
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
                    >
                      Link
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
