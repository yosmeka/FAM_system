'use client';

import React from 'react';
import { AssetMaintenanceTab } from './AssetMaintenanceTab';

interface MaintenanceTabWrapperProps {
  assetId: string;
  assetName: string;
  lastMaintenance?: string | null;
  nextMaintenance?: string | null;
}

export function MaintenanceTabWrapper({
  assetId,
  assetName,
  lastMaintenance,
  nextMaintenance
}: MaintenanceTabWrapperProps) {
  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Asset Maintenance</h2>
      <p className="mb-4">
        <a 
          href={`/test-maintenance?assetId=${assetId}`} 
          target="_blank" 
          className="text-blue-600 underline"
        >
          View Maintenance Records in Test Page
        </a>
      </p>
      <AssetMaintenanceTab
        assetId={assetId}
        assetName={assetName}
        lastMaintenance={lastMaintenance}
        nextMaintenance={nextMaintenance}
      />
    </div>
  );
}
