import { TransferStatus } from '@prisma/client';
import { Document } from './document';

export interface Transfer {
  id: string;
  assetId: string;
  reason: string;
  createdAt: Date;
  updatedAt: Date;
  fromDepartment: string;
  requesterId: string;
  toDepartment: string;
  status: TransferStatus;
  managerReason?: string | null;
  asset?: {
    id: string;
    name?: string | null;
    serialNumber: string;
    status?: string | null;
    location?: string | null;
    currentValue?: number | null;
    currentDepartment?: string | null;
    itemDescription?: string | null;
  };
  requester?: {
    id?: string;
    name?: string | null;
    email: string;
  };
  document?: Document;
}
