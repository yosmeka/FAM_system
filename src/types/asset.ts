export interface Asset {
  id: string;
  name: string;
  description?: string | null;
  serialNumber: string;
  purchaseDate: Date;
  purchasePrice: number;
  currentValue: number;
  status: string;
  location?: string | null;
  department?: string | null;
  category?: string | null;
  supplier?: string | null;
  warrantyExpiry?: Date | null;
  lastMaintenance?: Date | null;
  nextMaintenance?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
