import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/middleware/rbac';
import { AuditNotificationService } from '@/lib/auditNotifications';

// POST /api/audits/workflow - Create audit from assignment or request
export const POST = withRole(['ADMIN', 'MANAGER', 'USER'], async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      assetId,
      assignmentId,
      requestId,
      auditDate,
      condition,
      locationVerified = true,
      notes,
      discrepancies,
      photoUrls,
      nextAuditDate,
    } = body;

    // Validate required fields
    if (!assetId || !auditDate) {
      return NextResponse.json(
        { error: 'Missing required fields: assetId, auditDate' },
        { status: 400 }
      );
    }

    // Verify asset exists
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      select: { id: true, name: true },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Verify assignment or request if provided
    let assignment = null;
    let auditRequest = null;

    if (assignmentId) {
      assignment = await prisma.auditAssignment.findUnique({
        where: { id: assignmentId },
        select: {
          id: true,
          assignedToId: true,
          status: true,
        },
      });

      if (!assignment) {
        return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
      }

      // Verify user is assigned to this audit
      if (session.user.role === 'USER' && assignment.assignedToId !== session.user.id) {
        return NextResponse.json({ error: 'Not assigned to this audit' }, { status: 403 });
      }
    }

    if (requestId) {
      auditRequest = await prisma.auditRequest.findUnique({
        where: { id: requestId },
        select: {
          id: true,
          requesterId: true,
          status: true,
        },
      });

      if (!auditRequest) {
        return NextResponse.json({ error: 'Audit request not found' }, { status: 404 });
      }

      // Verify request is approved
      if (auditRequest.status !== 'APPROVED') {
        return NextResponse.json(
          { error: 'Audit request must be approved before performing audit' },
          { status: 400 }
        );
      }

      // Verify user is the requester or has permission
      if (session.user.role === 'USER' && auditRequest.requesterId !== session.user.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Create the audit
    const audit = await prisma.assetAudit.create({
      data: {
        assetId,
        auditDate: new Date(auditDate),
        auditedBy: session.user.name || session.user.email || 'Unknown',
        auditorId: session.user.id,
        assignmentId,
        requestId,
        status: body.status || 'PENDING',
        workflowStatus: body.workflowStatus || 'DRAFT',
        condition,
        locationVerified,
        actualLocation: body.actualLocation,
        notes,
        discrepancies,
        recommendations: body.recommendations,
        checklistItems: body.checklistItems ? JSON.stringify(body.checklistItems) : null,
        photoUrls: photoUrls ? photoUrls.join(',') : null,
        nextAuditDate: nextAuditDate ? new Date(nextAuditDate) : null,
      },
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            serialNumber: true,
            department: true,
            category: true,
          },
        },
        auditor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignment: {
          select: {
            id: true,
            title: true,
            assignedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        request: {
          select: {
            id: true,
            title: true,
            manager: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Update assignment status if applicable
    if (assignmentId && assignment) {
      await prisma.auditAssignment.update({
        where: { id: assignmentId },
        data: {
          status: 'IN_PROGRESS',
          startedAt: new Date(),
        },
      });
    }

    // Send notification to manager if audit is submitted for review
    if (audit.workflowStatus === 'PENDING_REVIEW') {
      const managerId = assignment?.assignedBy?.id || request?.manager?.id;
      if (managerId) {
        await AuditNotificationService.notifyAuditCompleted({
          id: audit.id,
          assignmentId: audit.assignmentId,
          requestId: audit.requestId,
          auditorId: audit.auditorId,
          asset: {
            name: audit.asset.name,
            serialNumber: audit.asset.serialNumber,
          },
          condition: audit.condition,
          managerId: managerId,
        });
      }
    }

    return NextResponse.json(audit, { status: 201 });
  } catch (error) {
    console.error('Error creating audit:', error);
    return NextResponse.json(
      { error: 'Failed to create audit' },
      { status: 500 }
    );
  }
});

// PUT /api/audits/workflow - Submit audit for review
export const PUT = withRole(['ADMIN', 'MANAGER', 'USER'], async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { auditId, action, ...updateData } = body;

    if (!auditId) {
      return NextResponse.json({ error: 'Missing auditId' }, { status: 400 });
    }

    // Get current audit
    const currentAudit = await prisma.assetAudit.findUnique({
      where: { id: auditId },
      include: {
        assignment: {
          select: {
            id: true,
            assignedById: true,
          },
        },
        request: {
          select: {
            id: true,
            managerId: true,
          },
        },
      },
    });

    if (!currentAudit) {
      return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
    }

    const userRole = session.user.role;
    const userId = session.user.id;

    let updateFields: any = {};

    if (action === 'submit_for_review' && userRole === 'USER') {
      // User submits audit for manager review
      if (currentAudit.auditorId !== userId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      updateFields = {
        workflowStatus: 'PENDING_REVIEW',
        status: 'COMPLETED',
        ...updateData,
      };

      // Update assignment if applicable
      if (currentAudit.assignmentId) {
        await prisma.auditAssignment.update({
          where: { id: currentAudit.assignmentId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
          },
        });
      }
    } else if (action === 'approve' && userRole === 'MANAGER') {
      // Only MANAGER can approve audit (not ADMIN)
      const canApprove = (currentAudit.assignment?.assignedById === userId) ||
        (currentAudit.request?.managerId === userId);

      if (!canApprove) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      updateFields = {
        workflowStatus: 'APPROVED',
        managerApproval: true,
        reviewedBy: session.user.name || session.user.email,
        reviewedAt: new Date(),
        reviewNotes: updateData.reviewNotes,
      };

      // Update asset's last audit date
      await prisma.asset.update({
        where: { id: currentAudit.assetId },
        data: {
          lastAuditDate: currentAudit.auditDate,
          nextAuditDate: currentAudit.nextAuditDate,
        },
      });

      // Update assignment status to COMPLETED when approved
      if (currentAudit.assignmentId) {
        await prisma.auditAssignment.update({
          where: { id: currentAudit.assignmentId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
          },
        });
      }

      // Update request status if applicable
      if (currentAudit.requestId) {
        await prisma.auditRequest.update({
          where: { id: currentAudit.requestId },
          data: {
            status: 'COMPLETED',
          },
        });
      }
    } else if (action === 'reject' && userRole === 'MANAGER') {
      // Only MANAGER can reject audit (not ADMIN)
      const canReject = (currentAudit.assignment?.assignedById === userId) ||
        (currentAudit.request?.managerId === userId);

      if (!canReject) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      updateFields = {
        workflowStatus: 'REQUIRES_REVISION',
        managerApproval: false,
        reviewedBy: session.user.name || session.user.email,
        reviewedAt: new Date(),
        reviewNotes: updateData.reviewNotes,
      };

      // Update assignment status to IN_PROGRESS when rejected (needs revision)
      if (currentAudit.assignmentId) {
        await prisma.auditAssignment.update({
          where: { id: currentAudit.assignmentId },
          data: {
            status: 'IN_PROGRESS',
            // Don't update completedAt since it's not completed yet
          },
        });
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid action or insufficient permissions' },
        { status: 400 }
      );
    }

    const updatedAudit = await prisma.assetAudit.update({
      where: { id: auditId },
      data: updateFields,
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            serialNumber: true,
            department: true,
            category: true,
          },
        },
        auditor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignment: {
          select: {
            id: true,
            title: true,
            assignedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        request: {
          select: {
            id: true,
            title: true,
            manager: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Send notifications based on action
    if (action === 'submit_for_review') {
      // Notify manager that audit is ready for review
      const managerId = updatedAudit.assignment?.assignedBy?.id || updatedAudit.request?.manager?.id;
      if (managerId) {
        await AuditNotificationService.notifyAuditCompleted({
          id: updatedAudit.id,
          assignmentId: updatedAudit.assignmentId,
          requestId: updatedAudit.requestId,
          auditorId: updatedAudit.auditorId,
          asset: {
            name: updatedAudit.asset.name,
            serialNumber: updatedAudit.asset.serialNumber,
          },
          condition: updatedAudit.condition,
          managerId: managerId,
        });
      }
    } else if (action === 'approve') {
      // Notify auditor that audit was approved
      await AuditNotificationService.notifyAuditApproved({
        id: updatedAudit.id,
        auditorId: updatedAudit.auditorId,
        managerId: userId,
        asset: {
          name: updatedAudit.asset.name,
          serialNumber: updatedAudit.asset.serialNumber,
        },
        reviewNotes: updatedAudit.reviewNotes,
      });
    } else if (action === 'reject') {
      // Notify auditor that audit was rejected
      await AuditNotificationService.notifyAuditRejected({
        id: updatedAudit.id,
        auditorId: updatedAudit.auditorId,
        managerId: userId,
        asset: {
          name: updatedAudit.asset.name,
          serialNumber: updatedAudit.asset.serialNumber,
        },
        rejectionReason: updateData.rejectionReason || 'Audit requires revision',
        reviewNotes: updatedAudit.reviewNotes,
      });
    }

    return NextResponse.json(updatedAudit);
  } catch (error) {
    console.error('Error updating audit workflow:', error);
    return NextResponse.json(
      { error: 'Failed to update audit workflow' },
      { status: 500 }
    );
  }
});
