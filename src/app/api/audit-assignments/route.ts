import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/middleware/rbac';
import { AuditNotificationService } from '@/lib/auditNotifications';

// GET /api/audit-assignments - Get audit assignments
export const GET = withRole(['MANAGER',  'AUDITOR'], async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role') || session.user.role;
    const userId = session.user.id;

    let whereClause: any = {};

    // Filter based on user role
    if (role === 'AUDITOR') {
      // Users see only assignments assigned to them
      whereClause.assignedToId = userId;
    } else if (role === 'MANAGER') {
      // Managers see assignments they created or all assignments in their scope
      whereClause.OR = [
        { assignedById: userId },
        // Could add department-based filtering here if needed
      ];
    }
    // ADMIN sees all assignments (no additional filter)

    const assignments = await prisma.auditAssignment.findMany({
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
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedBy: {
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

    return Response.json(assignments);
  } catch (error) {
    console.error('Error fetching audit assignments:', error);
    return Response.json(
      { error: 'Failed to fetch audit assignments' },
      { status: 500 }
    );
  }
});

// POST /api/audit-assignments - Create new audit assignment (Manager/only)
export const POST = withRole([ 'MANAGER','AUDITOR'], async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      assetId,
      assignedToId,
      title,
      description,
      priority = 'MEDIUM',
      dueDate,
      scheduledDate,
      instructions,
      checklistItems,
      estimatedHours,
    } = body;

    // Validate required fields
    if (!assetId || !assignedToId || !title || !dueDate) {
      return Response.json(
        { error: 'Missing required fields: assetId, assignedToId, title, dueDate' },
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

    // Verify assigned user exists and is a AUDITOR user with the correct role
    const assignedUser = await prisma.user.findUnique({
      where: { id: assignedToId },
      select: { id: true, name: true, role: true },
    });

    if (!assignedUser) {
      return Response.json({ error: 'Assigned user not found' }, { status: 404 });
    }

    if (assignedUser.role !== 'AUDITOR') {
      return Response.json(
        { error: 'Can only assign audits to users with USER role' },
        { status: 400 }
      );
    }

    // Create audit assignment
    const assignment = await prisma.auditAssignment.create({
      data: {
        assetId,
        assignedToId,
        assignedById: session.user.id,
        title,
        description,
        priority,
        dueDate: new Date(dueDate),
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        instructions,
        checklistItems: checklistItems ? JSON.stringify(checklistItems) : null,
        estimatedHours,
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
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Send notification to assigned user
    await AuditNotificationService.notifyAssignmentCreated({
      id: assignment.id,
      title: assignment.title,
      assignedToId: assignment.assignedToId,
      assignedById: assignment.assignedById,
      asset: {
        name: assignment.asset.name,
        serialNumber: assignment.asset.serialNumber,
      },
      dueDate: assignment.dueDate,
    });

    return Response.json(assignment, { status: 201 });
  } catch (error) {
    console.error('Error creating audit assignment:', error);
    return Response.json(
      { error: 'Failed to create audit assignment' },
      { status: 500 }
    );
  }
});
