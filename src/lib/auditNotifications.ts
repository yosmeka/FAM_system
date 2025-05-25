import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface NotificationData {
  userId: string;
  message: string;
  type: 'AUDIT_ASSIGNMENT' | 'AUDIT_REQUEST' | 'AUDIT_APPROVAL' | 'AUDIT_REJECTION' | 'AUDIT_COMPLETED';
  meta?: any;
}

export class AuditNotificationService {
  
  /**
   * Send notification to a user
   */
  static async sendNotification(data: NotificationData) {
    try {
      await prisma.notification.create({
        data: {
          userId: data.userId,
          message: data.message,
          type: data.type,
          meta: data.meta ? JSON.stringify(data.meta) : null,
          read: false,
        },
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  /**
   * Send notification when a new audit assignment is created
   */
  static async notifyAssignmentCreated(assignment: {
    id: string;
    title: string;
    assignedToId: string;
    assignedById: string;
    asset: { name: string; serialNumber: string };
    dueDate: Date;
  }) {
    const assignedBy = await prisma.user.findUnique({
      where: { id: assignment.assignedById },
      select: { name: true, email: true },
    });

    await this.sendNotification({
      userId: assignment.assignedToId,
      message: `New audit assignment: "${assignment.title}" for ${assignment.asset.name} (${assignment.asset.serialNumber}). Due: ${assignment.dueDate.toLocaleDateString()}. Assigned by: ${assignedBy?.name || 'Manager'}`,
      type: 'AUDIT_ASSIGNMENT',
      meta: {
        assignmentId: assignment.id,
        assetName: assignment.asset.name,
        assetSerial: assignment.asset.serialNumber,
        dueDate: assignment.dueDate.toISOString(),
        assignedBy: assignedBy?.name,
      },
    });
  }

  /**
   * Send notification when a new audit request is created
   */
  static async notifyRequestCreated(request: {
    id: string;
    title: string;
    requesterId: string;
    managerId?: string;
    asset: { name: string; serialNumber: string };
    urgency: string;
  }) {
    const requester = await prisma.user.findUnique({
      where: { id: request.requesterId },
      select: { name: true, email: true },
    });

    // If specific manager assigned, notify them
    if (request.managerId) {
      await this.sendNotification({
        userId: request.managerId,
        message: `New audit request: "${request.title}" for ${request.asset.name} (${request.asset.serialNumber}). Urgency: ${request.urgency}. Requested by: ${requester?.name || 'User'}`,
        type: 'AUDIT_REQUEST',
        meta: {
          requestId: request.id,
          assetName: request.asset.name,
          assetSerial: request.asset.serialNumber,
          urgency: request.urgency,
          requestedBy: requester?.name,
        },
      });
    } else {
      // Notify all managers
      const managers = await prisma.user.findMany({
        where: { role: 'MANAGER' },
        select: { id: true },
      });

      for (const manager of managers) {
        await this.sendNotification({
          userId: manager.id,
          message: `New unassigned audit request: "${request.title}" for ${request.asset.name} (${request.asset.serialNumber}). Urgency: ${request.urgency}. Requested by: ${requester?.name || 'User'}`,
          type: 'AUDIT_REQUEST',
          meta: {
            requestId: request.id,
            assetName: request.asset.name,
            assetSerial: request.asset.serialNumber,
            urgency: request.urgency,
            requestedBy: requester?.name,
          },
        });
      }
    }
  }

  /**
   * Send notification when an audit request is approved
   */
  static async notifyRequestApproved(request: {
    id: string;
    title: string;
    requesterId: string;
    managerId: string;
    asset: { name: string; serialNumber: string };
    reviewNotes?: string;
  }) {
    const manager = await prisma.user.findUnique({
      where: { id: request.managerId },
      select: { name: true, email: true },
    });

    await this.sendNotification({
      userId: request.requesterId,
      message: `Your audit request "${request.title}" for ${request.asset.name} (${request.asset.serialNumber}) has been approved by ${manager?.name || 'Manager'}. You can now perform the audit.${request.reviewNotes ? ` Notes: ${request.reviewNotes}` : ''}`,
      type: 'AUDIT_APPROVAL',
      meta: {
        requestId: request.id,
        assetName: request.asset.name,
        assetSerial: request.asset.serialNumber,
        approvedBy: manager?.name,
        reviewNotes: request.reviewNotes,
      },
    });
  }

  /**
   * Send notification when an audit request is rejected
   */
  static async notifyRequestRejected(request: {
    id: string;
    title: string;
    requesterId: string;
    managerId: string;
    asset: { name: string; serialNumber: string };
    rejectionReason: string;
    reviewNotes?: string;
  }) {
    const manager = await prisma.user.findUnique({
      where: { id: request.managerId },
      select: { name: true, email: true },
    });

    await this.sendNotification({
      userId: request.requesterId,
      message: `Your audit request "${request.title}" for ${request.asset.name} (${request.asset.serialNumber}) has been rejected by ${manager?.name || 'Manager'}. Reason: ${request.rejectionReason}${request.reviewNotes ? ` Notes: ${request.reviewNotes}` : ''}`,
      type: 'AUDIT_REJECTION',
      meta: {
        requestId: request.id,
        assetName: request.asset.name,
        assetSerial: request.asset.serialNumber,
        rejectedBy: manager?.name,
        rejectionReason: request.rejectionReason,
        reviewNotes: request.reviewNotes,
      },
    });
  }

  /**
   * Send notification when an audit is completed and submitted for review
   */
  static async notifyAuditCompleted(audit: {
    id: string;
    assignmentId?: string;
    requestId?: string;
    auditorId: string;
    asset: { name: string; serialNumber: string };
    condition: string;
    managerId: string;
  }) {
    const auditor = await prisma.user.findUnique({
      where: { id: audit.auditorId },
      select: { name: true, email: true },
    });

    await this.sendNotification({
      userId: audit.managerId,
      message: `Audit completed for ${audit.asset.name} (${audit.asset.serialNumber}) by ${auditor?.name || 'Auditor'}. Condition: ${audit.condition}. Please review the audit results.`,
      type: 'AUDIT_COMPLETED',
      meta: {
        auditId: audit.id,
        assignmentId: audit.assignmentId,
        requestId: audit.requestId,
        assetName: audit.asset.name,
        assetSerial: audit.asset.serialNumber,
        condition: audit.condition,
        auditedBy: auditor?.name,
      },
    });
  }

  /**
   * Send notification when an audit is approved by manager
   */
  static async notifyAuditApproved(audit: {
    id: string;
    auditorId: string;
    managerId: string;
    asset: { name: string; serialNumber: string };
    reviewNotes?: string;
  }) {
    const manager = await prisma.user.findUnique({
      where: { id: audit.managerId },
      select: { name: true, email: true },
    });

    await this.sendNotification({
      userId: audit.auditorId,
      message: `Your audit for ${audit.asset.name} (${audit.asset.serialNumber}) has been approved by ${manager?.name || 'Manager'}.${audit.reviewNotes ? ` Notes: ${audit.reviewNotes}` : ''}`,
      type: 'AUDIT_APPROVAL',
      meta: {
        auditId: audit.id,
        assetName: audit.asset.name,
        assetSerial: audit.asset.serialNumber,
        approvedBy: manager?.name,
        reviewNotes: audit.reviewNotes,
      },
    });
  }

  /**
   * Send notification when an audit is rejected by manager
   */
  static async notifyAuditRejected(audit: {
    id: string;
    auditorId: string;
    managerId: string;
    asset: { name: string; serialNumber: string };
    rejectionReason: string;
    reviewNotes?: string;
  }) {
    const manager = await prisma.user.findUnique({
      where: { id: audit.managerId },
      select: { name: true, email: true },
    });

    await this.sendNotification({
      userId: audit.auditorId,
      message: `Your audit for ${audit.asset.name} (${audit.asset.serialNumber}) has been rejected by ${manager?.name || 'Manager'}. Reason: ${audit.rejectionReason}${audit.reviewNotes ? ` Notes: ${audit.reviewNotes}` : ''}`,
      type: 'AUDIT_REJECTION',
      meta: {
        auditId: audit.id,
        assetName: audit.asset.name,
        assetSerial: audit.asset.serialNumber,
        rejectedBy: manager?.name,
        rejectionReason: audit.rejectionReason,
        reviewNotes: audit.reviewNotes,
      },
    });
  }

  /**
   * Send notification when assignment status changes
   */
  static async notifyAssignmentStatusChange(assignment: {
    id: string;
    title: string;
    assignedToId: string;
    assignedById: string;
    status: string;
    asset: { name: string; serialNumber: string };
  }) {
    const assignedTo = await prisma.user.findUnique({
      where: { id: assignment.assignedToId },
      select: { name: true, email: true },
    });

    // Notify the manager who created the assignment
    await this.sendNotification({
      userId: assignment.assignedById,
      message: `Assignment "${assignment.title}" for ${assignment.asset.name} (${assignment.asset.serialNumber}) status changed to ${assignment.status.replace('_', ' ')} by ${assignedTo?.name || 'Auditor'}`,
      type: 'AUDIT_ASSIGNMENT',
      meta: {
        assignmentId: assignment.id,
        assetName: assignment.asset.name,
        assetSerial: assignment.asset.serialNumber,
        status: assignment.status,
        updatedBy: assignedTo?.name,
      },
    });
  }
}
