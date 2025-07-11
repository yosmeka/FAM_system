export interface Asset {
  id: string;
  name: string;
  itemDescription?: string | null;     // Item Description (renamed from description)
  serialNumber: string;                // Serial # (kept as is)
  oldTagNumber?: string | null;        // Old Tag # (new field)
  newTagNumber?: string | null;        // New Tag # (new field)
  grnNumber?: string | null;           // GRN # (new field)
  grnDate?: Date | null;               // GRN Date (new field)
  unitPrice: number;                   // Unit Price (renamed from purchasePrice)
  sivNumber?: string | null;           // SIV # (new field)
  sivDate: Date;                       // SIV Date (renamed from purchaseDate)
  currentDepartment?: string | null;   // Current Department (renamed from department)
  remark?: string | null;              // Remark (new field)
  usefulLifeYears?: number | null;     // Useful Life In Years (renamed from usefulLifeMonths)
  residualPercentage?: number | null;  // Residual Percentage (new field)
  currentValue: number;
  status: string;
  location?: string | null;
  category?: string | null;
  supplier?: string | null;
  warrantyExpiry?: Date | null;
  lastMaintenance?: Date | null;
  nextMaintenance?: Date | null;
  salvageValue?: number | null;        // Keep as is
  createdAt: Date;
  updatedAt: Date;
}
