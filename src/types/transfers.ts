import type { User } from '@/types/user';
import type { Asset } from '@/types/asset';

export interface TransferRequest {
  id: string;
  assetId: string;
  requesterId: string;
  fromDepartment: string;
  toDepartment: string;
  reason: string;
  status: TransferStatus;
  createdAt: Date;
  updatedAt: Date;
  requester?: User;
  asset?: Asset & {
    currentDepartment?: string | null;
    itemDescription?: string | null;
  };
}

export type TransferStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
