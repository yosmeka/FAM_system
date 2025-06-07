import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// POST /api/maintenance/[id]/review
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers and admins can review maintenance tasks
    if (session.user?.role !== 'MANAGER' && session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only managers can review maintenance tasks' }, { status: 403 });
    }

    const body = await request.json();
    const { action, reviewNotes } = body; // action: 'approve' or 'reject'

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be "approve" or "reject"' }, { status: 400 });
    }

    // Await params
    const { id } = await params;

    // Get the maintenance task
    const maintenanceTask = await prisma.maintenance.findUnique({
      where: { id },
      include: {
        asset: {
          select: {
            name: true,
            serialNumber: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!maintenanceTask) {
      return NextResponse.json({ error: 'Maintenance task not found' }, { status: 404 });
    }

    // Check if task is in a reviewable status
    // PENDING_REVIEW: for corrective maintenance
    // WORK_COMPLETED: for preventive maintenance
    if (!['PENDING_REVIEW', 'WORK_COMPLETED'].includes(maintenanceTask.status)) {
      return NextResponse.json({
        error: `Task is not in a reviewable status. Current status: ${maintenanceTask.status}`
      }, { status: 400 });
    }

    // Update the task status based on manager's decision
    const newStatus = action === 'approve' ? 'COMPLETED' : 'REJECTED';
    const updateData: any = {
      status: newStatus,
    };

    // Add review notes to the appropriate field
    if (reviewNotes) {
      // For preventive maintenance (WORK_COMPLETED), use managerReviewNotes
      // For corrective maintenance (PENDING_REVIEW), use notes field
      if (maintenanceTask.status === 'WORK_COMPLETED') {
        updateData.managerReviewNotes = reviewNotes;
      } else {
        const existingNotes = maintenanceTask.notes || '';
        const reviewNote = `\n\n--- Manager Review (${new Date().toLocaleString()}) ---\n${reviewNotes}`;
        updateData.notes = existingNotes + reviewNote;
      }
    }

    // If approved, set final completion date and approval info
    if (action === 'approve') {
      updateData.completedAt = maintenanceTask.completedAt || maintenanceTask.workCompletedAt || new Date();
      updateData.finalApprovedAt = new Date();
      updateData.finalApprovedBy = session.user?.id;
    }

    const updatedTask = await prisma.maintenance.update({
      where: { id },
      data: updateData,
      include: {
        asset: {
          select: {
            name: true,
            serialNumber: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // If approved, update asset maintenance dates
    if (action === 'approve') {
      const nextMaintenanceDate = new Date();
      nextMaintenanceDate.setMonth(nextMaintenanceDate.getMonth() + 3); // Schedule next maintenance in 3 months

      await prisma.asset.update({
        where: { id: updatedTask.assetId },
        data: {
          lastMaintenance: new Date(),
          nextMaintenance: nextMaintenanceDate,
        },
      });
    }

    // Send notification to technician
    try {
      const { sendNotification } = await import('@/lib/notifications');

      const message = action === 'approve'
        ? `✅ Your maintenance task for "${updatedTask.asset.name}" has been approved by the manager`
        : `❌ Your maintenance task for "${updatedTask.asset.name}" has been rejected by the manager${reviewNotes ? `. Reason: ${reviewNotes}` : ''}`;

      const notificationType = action === 'approve' ? 'maintenance_approved' : 'maintenance_rejected';

      if (updatedTask.assignedTo?.id) {
        await sendNotification({
          userId: updatedTask.assignedTo.id,
          message,
          type: notificationType,
          meta: {
            assetId: updatedTask.assetId,
            maintenanceId: updatedTask.id,
            action,
            reviewNotes,
            managerName: session.user?.name,
            assetName: updatedTask.asset.name,
            assetSerialNumber: updatedTask.asset.serialNumber
          },
        });

        console.log(`Sent ${notificationType} notification to technician ${updatedTask.assignedTo.id}`);
      }
    } catch (notificationError) {
      console.error('Error sending notification to technician:', notificationError);
      // Continue even if notification fails
    }

    return NextResponse.json({
      success: true,
      task: updatedTask,
      action,
      message: `Task ${action}d successfully`
    });

  } catch (error) {
    console.error('Error reviewing maintenance task:', error);
    return NextResponse.json(
      { error: 'Failed to review maintenance task' },
      { status: 500 }
    );
  }
}
