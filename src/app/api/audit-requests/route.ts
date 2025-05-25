import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/middleware/rbac';

// GET /api/audit-requests - Get audit requests
export const GET = withRole(['ADMIN', 'MANAGER', 'USER'], async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') || session.user.role;
    const userId = session.user.id;

    let whereClause: any = {};

    // Filter based on user role
    if (role === 'USER') {
      // Users see only requests they created
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

    return NextResponse.json(requests);
  } catch (error) {
    console.error('Error fetching audit requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit requests' },
      { status: 500 }
    );
  }
});

// POST /api/audit-requests - Create new audit request (User role)
export const POST = withRole(['ADMIN', 'MANAGER', 'USER'], async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      return NextResponse.json(
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
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // If managerId is provided, verify manager exists and has MANAGER role
    if (managerId) {
      const manager = await prisma.user.findUnique({
        where: { id: managerId },
        select: { id: true, name: true, role: true },
      });

      if (!manager) {
        return NextResponse.json({ error: 'Manager not found' }, { status: 404 });
      }

      if (manager.role !== 'MANAGER' && manager.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Selected user is not a manager' },
          { status: 400 }
        );
      }
    }

    // Create audit request
    const auditRequest = await prisma.auditRequest.create({
      data: {
        assetId,
        requesterId: session.user.id,
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

    // TODO: Send notification to manager
    // if (managerId) {
    //   await sendAuditRequestNotification(auditRequest);
    // }

    return NextResponse.json(auditRequest, { status: 201 });
  } catch (error) {
    console.error('Error creating audit request:', error);
    return NextResponse.json(
      { error: 'Failed to create audit request' },
      { status: 500 }
    );
  }
});
