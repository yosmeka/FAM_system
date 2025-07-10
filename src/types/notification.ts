export interface NotificationMeta {
  assetId?: string;
  transferId?: string;
  documentUrl?: string | null;
  rejectionReason?: string | null;
  [key: string]: unknown;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
  type: string;
  meta: NotificationMeta | null;
}
