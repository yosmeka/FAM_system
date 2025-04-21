import type { User } from '@/types/user';
import type { Asset } from '@/types/asset';

export interface DisposalRequest {
  id: string;
  assetId: string;
  requesterId: string;
  reason: string;
  method: DisposalMethod;
  expectedValue: number;
  actualValue?: number;
  status: DisposalStatus;
  createdAt: Date;
  updatedAt: Date;
  requester?: User;
  asset?: Asset;
}

export type DisposalMethod = 'SALE' | 'DONATION' | 'RECYCLE' | 'SCRAP';
export type DisposalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
