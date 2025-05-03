export interface Asset {
  id: string;
  name: string;
  description: string;
  serialNumber: string;
  purchaseDate: string;
  purchasePrice: number;
  currentValue: number;
  status: string;
  location: string;
  department: string;
  category: string;
  type: string;
  supplier: string;
  warrantyExpiry: string | null;
  lastMaintenance: string | null;
  nextMaintenance: string | null;
  createdAt: string;
  updatedAt: string;
  linkedTo: LinkedAsset[];
  depreciations: Array<{
    usefulLife: number;
  }>;
}

export interface LinkedAsset {
  id: string;
  fromAssetId: string;
  toAssetId: string;
  fromAsset: Asset;
  toAsset: Asset;
  createdAt: string;
  updatedAt: string;
}

export interface AssetHistory {
  id: string;
  assetId: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  changedBy: string;
  createdAt: string;
  updatedAt: string;
}
