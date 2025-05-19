import type { User } from '@/types/user';
import type { Asset } from '@/types/asset';

export interface MaintenanceRequest {
  id: string;
  assetId: string;
  requesterId: string;
  description: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  cost?: number;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  requester?: User;
  asset?: Asset;
}

export type MaintenancePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type MaintenanceStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
