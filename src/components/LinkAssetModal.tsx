import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Asset } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X } from 'lucide-react';

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

  // Add loading state for assets
  const [isAssetsLoading, setIsAssetsLoading] = useState(availableAssets.length === 0);

  // Update loading state when availableAssets changes
  useEffect(() => {
    setIsAssetsLoading(availableAssets.length === 0);
  }, [availableAssets]);

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
      <DialogContent className="sm:max-w-[600px] bg-[#ffffff] dark:bg-gray-800">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium">Link Asset</DialogTitle>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="search">Search Assets</Label>
            <Input
              id="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by asset tag ID or description..."
            />
          </div>

          <ScrollArea className="h-[300px] rounded-md border">
            {isLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
              </div>
            ) : filteredAssets.length > 0 ? (
              <div className="space-y-2 p-2">
                {filteredAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent dark:hover:bg-gray-700"
                  >
                    <div>
                      <p className="font-medium">{asset.serialNumber}</p>
                      <p className="text-sm text-muted-foreground">{asset.name}</p>
                    </div>
                    <Button
                      onClick={() => handleLinkAsset(asset.id)}
                      variant="destructive"
                    >
                      Link
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No assets found
              </div>
            )}
          </ScrollArea>

          <div className="flex justify-end">
            <Button
              onClick={onClose}
              variant="outline"
              className="mr-2 dark:text-gray-100"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
