import type { User } from '@/types/user';
import type { Asset } from '@/types/asset';

export interface MaintenanceRequest {
  id: string;
  assetId: string;
  requesterId: string;
  managerId?: string;
  description: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  cost?: number;
  completedAt?: Date;
  scheduledDate?: string | Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  requester?: User;
  manager?: User;
  asset?: Asset;
  maintenanceType?: MaintenanceType;
}

export type MaintenancePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type MaintenanceStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type MaintenanceType = 'PREVENTIVE' | 'CORRECTIVE' | 'INSPECTION';
