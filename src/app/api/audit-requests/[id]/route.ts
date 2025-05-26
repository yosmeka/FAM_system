import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/middleware/rbac';
import { AuditNotificationService } from '@/lib/auditNotifications';

// GET /api/audit-requests/[id] - Get specific audit request
export const GET = withRole(['ADMIN', 'MANAGER', 'USER'], async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const auditRequest = await prisma.auditRequest.findUnique({
      where: { id },
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            serialNumber: true,
            department: true,
            category: true,
            location: true,
            status: true,
          },
        },
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        audits: {
          include: {
            auditor: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            auditDate: 'desc',
          },
        },
      },
    });

    if (!auditRequest) {
      return NextResponse.json({ error: 'Audit request not found' }, { status: 404 });
    }

    // Check access permissions
    const userRole = session.user.role;
    const userId = session.user.id;

    if (userRole === 'USER' && auditRequest.requesterId !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (userRole === 'MANAGER' && auditRequest.managerId !== userId && auditRequest.managerId !== null) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json(auditRequest);
  } catch (error) {
    console.error('Error fetching audit request:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit request' },
      { status: 500 }
    );
  }
});

// PUT /api/audit-requests/[id] - Update audit request
export const PUT = withRole(['ADMIN', 'MANAGER', 'USER'], async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, ...updateData } = body;

    const { id } = await params;
    // Get current request
    const currentRequest = await prisma.auditRequest.findUnique({
      where: { id },
      select: {
        id: true,
        requesterId: true,
        managerId: true,
        status: true,
      },
    });

    if (!currentRequest) {
      return NextResponse.json({ error: 'Audit request not found' }, { status: 404 });
    }

    const userRole = session.user.role;
    const userId = session.user.id;

    let updateFields: any = {};

    // Handle manager actions (ONLY MANAGERS can approve/reject)
    if (action === 'approve' && userRole === 'MANAGER') {
      if (currentRequest.managerId !== userId && currentRequest.managerId !== null) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      updateFields = {
        status: 'APPROVED',
        reviewedAt: new Date(),
        approvedBy: userId,
        reviewNotes: updateData.reviewNotes,
        managerId: currentRequest.managerId || userId, // Assign manager if not already assigned
      };

      // Get the full request details for creating assignment
      const fullRequest = await prisma.auditRequest.findUnique({
        where: { id },
        include: {
          asset: true,
          requester: true,
        },
      });

      if (fullRequest) {
        // Create audit assignment for the requester to perform the audit
        await prisma.auditAssignment.create({
          data: {
            assetId: fullRequest.assetId,
            assignedToId: fullRequest.requesterId, // Assign to the original requester
            assignedById: userId, // Manager who approved the request
            title: `Audit Assignment: ${fullRequest.title}`,
            description: `Audit assignment created from approved request: ${fullRequest.title}`,
            priority: fullRequest.urgency as any, // Map urgency to priority
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            scheduledDate: fullRequest.requestedDate,
            status: 'PENDING',
            instructions: `Please perform the audit as requested. Original reason: ${fullRequest.reason}`,
            estimatedHours: 2, // Default estimated hours
          },
        });
      }
    } else if (action === 'reject' && userRole === 'MANAGER') {
      if (currentRequest.managerId !== userId && currentRequest.managerId !== null) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      updateFields = {
        status: 'REJECTED',
        reviewedAt: new Date(),
        approvedBy: userId,
        reviewNotes: updateData.reviewNotes,
        rejectionReason: updateData.rejectionReason,
        managerId: currentRequest.managerId || userId,
      };
    } else if (action === 'claim' && userRole === 'MANAGER') {
      // Manager claims an unassigned request
      if (currentRequest.managerId !== null) {
        return NextResponse.json(
          { error: 'Request already assigned to a manager' },
          { status: 400 }
        );
      }

      updateFields = {
        managerId: userId,
      };
    } else if (action === 'complete' && userRole === 'USER' && currentRequest.requesterId === userId) {
      // User marks request as completed after performing audit
      if (currentRequest.status !== 'APPROVED') {
        return NextResponse.json(
          { error: 'Request must be approved before completion' },
          { status: 400 }
        );
      }

      updateFields = {
        status: 'COMPLETED',
      };
    } else if (action === 'cancel' && userRole === 'USER' && currentRequest.requesterId === userId) {
      // User cancels their own request
      if (currentRequest.status === 'COMPLETED') {
        return NextResponse.json(
          { error: 'Cannot cancel completed request' },
          { status: 400 }
        );
      }

      updateFields = {
        status: 'CANCELLED',
      };
    } else if (userRole === 'USER' && currentRequest.requesterId === userId && currentRequest.status === 'PENDING_APPROVAL') {
      // User can edit their own pending request
      const allowedFields = [
        'title',
        'reason',
        'urgency',
        'requestedDate',
        'description',
        'expectedFindings',
        'attachments',
      ];

      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          if (field === 'requestedDate') {
            updateFields[field] = new Date(updateData[field]);
          } else {
            updateFields[field] = updateData[field];
          }
        }
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action or insufficient permissions' },
        { status: 400 }
      );
    }

    const updatedRequest = await prisma.auditRequest.update({
      where: { id },
      data: updateFields,
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            serialNumber: true,
            department: true,
            category: true,
            location: true,
          },
        },
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Send notifications based on action
    if (action === 'approve') {
      await AuditNotificationService.notifyRequestApproved({
        id: updatedRequest.id,
        title: updatedRequest.title,
        requesterId: updatedRequest.requesterId,
        managerId: updatedRequest.managerId!,
        asset: {
          name: updatedRequest.asset.name,
          serialNumber: updatedRequest.asset.serialNumber,
        },
        reviewNotes: updatedRequest.reviewNotes,
      });
    } else if (action === 'reject') {
      await AuditNotificationService.notifyRequestRejected({
        id: updatedRequest.id,
        title: updatedRequest.title,
        requesterId: updatedRequest.requesterId,
        managerId: updatedRequest.managerId!,
        asset: {
          name: updatedRequest.asset.name,
          serialNumber: updatedRequest.asset.serialNumber,
        },
        rejectionReason: updatedRequest.rejectionReason!,
        reviewNotes: updatedRequest.reviewNotes,
      });
    }

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error('Error updating audit request:', error);
    return NextResponse.json(
      { error: 'Failed to update audit request' },
      { status: 500 }
    );
  }
});

// DELETE /api/audit-requests/[id] - Delete audit request
export const DELETE = withRole(['ADMIN', 'MANAGER', 'USER'], async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    // Check if request exists and user has permission
    const auditRequest = await prisma.auditRequest.findUnique({
      where: { id },
      select: {
        id: true,
        requesterId: true,
        status: true,
      },
    });

    if (!auditRequest) {
      return NextResponse.json({ error: 'Audit request not found' }, { status: 404 });
    }

    // Users can only delete their own requests, and only if not completed
    if (session.user.role === 'USER') {
      if (auditRequest.requesterId !== session.user.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
      if (auditRequest.status === 'COMPLETED') {
        return NextResponse.json(
          { error: 'Cannot delete completed requests' },
          { status: 400 }
        );
      }
    }

    await prisma.auditRequest.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Audit request deleted successfully' });
  } catch (error) {
    console.error('Error deleting audit request:', error);
    return NextResponse.json(
      { error: 'Failed to delete audit request' },
      { status: 500 }
    );
  }
});
