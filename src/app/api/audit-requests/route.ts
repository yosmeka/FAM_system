//import { Response } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/middleware/rbac';
import { AuditNotificationService } from '@/lib/auditNotifications';

// GET /api/audit-requests - Get audit requests
export const GET = withRole(['MANAGER', 'AUDITOR'], async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') || session.user.role;
    const userId = session.user.id;

    let whereClause: Record<string, unknown> = {};

    // Filter based on user role
    if (role === 'AUDITOR') {
      // auditors see only requests they created
      whereClause.requesterId = userId;
    } else if (role === 'MANAGER') {
      // Managers see requests assigned to them for review
      whereClause.OR = [
        { managerId: userId },
        { managerId: null }, // Unassigned requests that managers can claim
      ];
    }
    // ADMIN sees all requests (no additional filter)

    const requests = await prisma.auditRequest.findMany({
      where: whereClause,
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
        audits: {
          select: {
            id: true,
            status: true,
            workflowStatus: true,
            auditDate: true,
            condition: true,
          },
          orderBy: {
            auditDate: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return Response.json(requests);
  } catch (error) {
    console.error('Error fetching audit requests:', error);
    return Response.json(
      { error: 'Failed to fetch audit requests' },
      { status: 500 }
    );
  }
});

// POST /api/audit-requests - Create new audit request (User role)
export const POST = withRole(['MANAGER',  'AUDITOR'], async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      assetId,
      managerId,
      title,
      reason,
      urgency = 'MEDIUM',
      requestedDate,
      description,
      expectedFindings,
      attachments,
    } = body;

    // Validate required fields
    if (!assetId || !title || !reason || !requestedDate) {
      return Response.json(
        { error: 'Missing required fields: assetId, title, reason, requestedDate' },
        { status: 400 }
      );
    }

    // Verify asset exists
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      select: { id: true, name: true },
    });

    if (!asset) {
      return Response.json({ error: 'Asset not found' }, { status: 404 });
    }

    // If managerId is provided, verify manager exists and has MANAGER role
    if (managerId) {
      const manager = await prisma.user.findUnique({
        where: { id: managerId },
        select: { id: true, name: true, role: true },
      });

      if (!manager) {
        return Response.json({ error: 'Manager not found' }, { status: 404 });
      }

      if (manager.role !== 'MANAGER' ) {
        return Response.json(
          { error: 'Selected user is not a manager' },
          { status: 400 }
        );
      }
    }

    // Create audit request
    const auditRequest = await prisma.auditRequest.create({
      data: {
        assetId,
        requesterId: session.user.id, // Now can be AUDITOR
        managerId,
        title,
        reason,
        urgency,
        requestedDate: new Date(requestedDate),
        description,
        expectedFindings,
        attachments,
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

    // Send notification to manager(s)
    await AuditNotificationService.notifyRequestCreated({
      id: auditRequest.id,
      title: auditRequest.title,
      requesterId: auditRequest.requesterId,
      managerId: auditRequest.managerId || undefined,
      asset: {
        name: auditRequest.asset.name,
        serialNumber: auditRequest.asset.serialNumber,
      },
      urgency: auditRequest.urgency,
    });

    return Response.json(auditRequest, { status: 201 });
  } catch (error) {
    console.error('Error creating audit request:', error);
    return Response.json(
      { error: 'Failed to create audit request' },
      { status: 500 }
    );
  }
});
