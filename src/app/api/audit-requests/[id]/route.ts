//import { Response } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/middleware/rbac';

// Only  MANAGER, and AUDITOR can view audit requests
export const GET = withRole(['MANAGER', 'AUDITOR'], async function GET(
  req: Request,
  ...args: unknown[]
) {
  const { params } = (args[0] || {}) as { params: Promise<{ id: string }> };
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Fetch the audit request
    const auditRequest = await prisma.auditRequest.findUnique({
      where: { id },
      include: { requester: true, asset: true },
    });

    if (!auditRequest) {
      return Response.json({ error: 'Audit request not found' }, { status: 404 });
    }

    // Only assigned auditor, manager, or admin can view
    if (
      session.user.role === 'AUDITOR' &&
      auditRequest.requesterId !== session.user.id
    ) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    return Response.json(auditRequest);
  } catch {
    return Response.json(
      { error: 'Failed to fetch audit request' },
      { status: 500 }
    );
  }
});

// Only  MANAGER, and AUDITOR can update audit requests
export const PUT = withRole(['MANAGER', 'AUDITOR'], async function PUT(
  req: Request,
  ...args: unknown[]
) {
  const { params } = (args[0] || {}) as { params: Promise<{ id: string }> };
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const auditRequest = await prisma.auditRequest.findUnique({
      where: { id },
    });

    if (!auditRequest) {
      return Response.json({ error: 'Audit request not found' }, { status: 404 });
    }

    // Only assigned auditor can submit/update the audit
    if (
      session.user.role === 'AUDITOR' &&
      auditRequest.requesterId !== session.user.id
    ) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();

    // Update logic here (e.g., status, findings, etc.)
    const updated = await prisma.auditRequest.update({
      where: { id },
      data: {
        ...body,
        updatedAt: new Date(),
      },
    });

    return Response.json(updated);
  } catch {
    return Response.json({ error: 'Failed to update audit request' }, { status: 500 });
  }
});

// DELETE /api/audit-requests/[id] - Delete audit request
export const DELETE = withRole(['MANAGER', 'AUDITOR'], async function DELETE(
  req: Request,
  ...args: unknown[]
) {
  const { params } = (args[0] || {}) as { params: Promise<{ id: string }> };
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
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
      return Response.json({ error: 'Audit request not found' }, { status: 404 });
    }

    // AUDITORs can only delete their own requests, and only if not completed
    if (session.user.role === 'AUDITOR') {
      if (auditRequest.requesterId !== session.user.id) {
        return Response.json({ error: 'Access denied' }, { status: 403 });
      }
      if (auditRequest.status === 'COMPLETED') {
        return Response.json(
          { error: 'Cannot delete completed requests' },
          { status: 400 }
        );
      }
    }

    await prisma.auditRequest.delete({
      where: { id },
    });

    return Response.json({ message: 'Audit request deleted successfully' });
  } catch {
    return Response.json(
      { error: 'Failed to delete audit request' },
      { status: 500 }
    );
  }
});
