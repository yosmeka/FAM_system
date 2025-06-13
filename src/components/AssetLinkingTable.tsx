import { useState, useEffect, useCallback } from 'react';
import { UnlinkAssetButton } from './UnlinkAssetButton';
import { toast } from 'react-hot-toast';

interface Asset {
  id: string;
  name: string;
  serialNumber: string;
  linkedTo?: any[];
  linkedFrom?: any[];
}

interface AssetLinkingTableProps {
  asset: Asset;
  onLinkClick: () => void;
  onUnlinkSuccess?: () => void; // Made optional
}

export function AssetLinkingTable({ asset, onLinkClick, onUnlinkSuccess }: AssetLinkingTableProps) {
  const [isChildAsset, setIsChildAsset] = useState(false);
  const [validChildLinks, setValidChildLinks] = useState<any[]>([]);
  const [validParentLinks, setValidParentLinks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0); // Add a refresh key to trigger re-fetching

  // Function to refresh the linked assets
  const refreshLinkedAssets = useCallback(() => {
    console.log("Refreshing linked assets...");
    setRefreshKey(prevKey => prevKey + 1); // Increment the refresh key to trigger a re-fetch
  }, []);

  // Handle unlink success internally
  const handleUnlinkSuccess = useCallback(() => {
    console.log("Asset unlinked successfully, refreshing data...");
    refreshLinkedAssets();

    // Also call the parent's onUnlinkSuccess if provided
    if (onUnlinkSuccess) {
      onUnlinkSuccess();
    }
  }, [onUnlinkSuccess, refreshLinkedAssets]);

  // Directly fetch linked assets from the database
  useEffect(() => {
    if (!asset) return;

    const fetchLinkedAssets = async () => {
      try {
        setIsLoading(true);
        console.log("DIRECT FETCH - Fetching linked assets for asset ID:", asset.id);

        // Fetch all linked assets for this asset
        const response = await fetch('/api/test/linked-assets');
        if (!response.ok) {
          throw new Error('Failed to fetch linked assets');
        }

        const data = await response.json();
        console.log("DIRECT FETCH - All linked assets:", data.linkedAssets);

        // Filter linked assets for this specific asset
        const childLinks = data.linkedAssets.filter((link: any) =>
          link.fromAssetId === asset.id
        );

        const parentLinks = data.linkedAssets.filter((link: any) =>
          link.toAssetId === asset.id
        );

        console.log("DIRECT FETCH - Child links for this asset:", childLinks);
        console.log("DIRECT FETCH - Parent links for this asset:", parentLinks);

        setValidChildLinks(childLinks);
        setValidParentLinks(parentLinks);
        setIsChildAsset(parentLinks.length > 0);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching linked assets:", error);
        toast.error("Failed to load linked assets");
        setIsLoading(false);
      }
    };

    fetchLinkedAssets();
  }, [asset, refreshKey]); // Add refreshKey to the dependency array

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Asset Linking</h2>
        <div className="p-8 text-center">
          <p>Loading linked assets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Asset Linking</h2>

      {/* <div className="mb-4">
        <div className="flex items-center mb-2">
          <input
            type="checkbox"
            id="transactAsWhole"
            className="mr-2 h-5 w-5 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700"
          />
          <label htmlFor="transactAsWhole" className="font-medium text-gray-900 dark:text-gray-100">Transact as a whole</label>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 ml-7">
          Select this checkbox to indicate that this asset and its linking assets should be audited/check-out/checked-in, etc., as a group.
        </p>
      </div> */}

      {/* Only show the Link Child Asset button if this is not a child asset */}
      {!isChildAsset && (
        <div className="flex justify-start mb-4">
          <button
            onClick={onLinkClick}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Link Child Asset
          </button>
        </div>
      )}

      {isChildAsset && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md mb-4">
          <p className="text-blue-700 dark:text-blue-300">
            This asset is a child component of another asset. Child assets cannot have their own linked assets.
          </p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-yellow-100 dark:bg-yellow-900/20">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider"></th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Relation</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Asset Tag ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider"></th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {/* Current Asset Row */}
            <tr className="bg-blue-50 dark:bg-blue-900/20">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">this asset &gt;</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                {isChildAsset ? 'Child' : 'Parent'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{asset.serialNumber}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{asset.name}</td>
              <td></td>
            </tr>

            {/* Parent Assets (if this is a child) */}
            {isChildAsset && validParentLinks.map((link) => (
              <tr key={link.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100"></td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">Parent</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{link.fromAsset.serialNumber}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{link.fromAsset.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <UnlinkAssetButton
                    assetId={link.fromAssetId}
                    linkId={link.id}
                    linkedAssetName={asset.name}
                    onSuccess={handleUnlinkSuccess}
                  />
                </td>
              </tr>
            ))}

            {/* Child Assets (if this is a parent) */}
            {!isChildAsset && validChildLinks.map((link) => (
              <tr key={link.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100"></td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">Child</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{link.toAsset.serialNumber}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{link.toAsset.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <UnlinkAssetButton
                    assetId={asset.id}
                    linkId={link.id}
                    linkedAssetName={link.toAsset.name}
                    onSuccess={handleUnlinkSuccess}
                  />
                </td>
              </tr>
            ))}

            {/* No linked assets message */}
            {!isChildAsset && validChildLinks.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  No linked child assets found
                </td>
              </tr>
            )}

            {isChildAsset && validParentLinks.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  No linked parent assets found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
