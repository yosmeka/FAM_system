import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET a specific audit
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; auditId: string }> }
) {
  try {
    // Get session for authentication
    const session = await getServerSession(authOptions);

    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Await params in Next.js 15
    const { id, auditId } = await params;

    // Check if the audit exists
    const audit = await prisma.assetAudit.findUnique({
      where: {
        id: auditId,
        assetId: id,
      },
    });

    if (!audit) {
      return Response.json({ error: 'Audit not found' }, { status: 404 });
    }

    return Response.json(audit);
  } catch (error) {
    console.error('Error fetching audit:', error);
    return Response.json(
      { error: 'Failed to fetch audit' },
      { status: 500 }
    );
  }
}

// PUT (update) a specific audit
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; auditId: string }> }
) {
  try {
    // Get session for authentication
    const session = await getServerSession(authOptions);

    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Await params in Next.js 15
    const { id, auditId } = await params;

    // Check if the audit exists
    const existingAudit = await prisma.assetAudit.findUnique({
      where: {
        id: auditId,
        assetId: id,
      },
    });

    if (!existingAudit) {
      return Response.json({ error: 'Audit not found' }, { status: 404 });
    }

    // Parse the request body
    const body = await request.json();

    // Update the audit
    const updatedAudit = await prisma.assetAudit.update({
      where: {
        id: auditId,
      },
      data: {
        auditDate: body.auditDate ? new Date(body.auditDate) : undefined,
        status: body.status || undefined,
        condition: body.condition || undefined,
        locationVerified: body.locationVerified !== undefined ? body.locationVerified : undefined,
        notes: body.notes !== undefined ? body.notes : undefined,
        discrepancies: body.discrepancies !== undefined ? body.discrepancies : undefined,
        discrepancyResolved: body.discrepancyResolved !== undefined ? body.discrepancyResolved : undefined,
        resolvedDate: body.resolvedDate ? new Date(body.resolvedDate) : body.resolvedDate === null ? null : undefined,
        resolvedBy: body.resolvedBy !== undefined ? body.resolvedBy : undefined,
        resolutionNotes: body.resolutionNotes !== undefined ? body.resolutionNotes : undefined,
        photoUrls: body.photoUrls !== undefined ? body.photoUrls : undefined,
        nextAuditDate: body.nextAuditDate ? new Date(body.nextAuditDate) : body.nextAuditDate === null ? null : undefined,
      },
    });

    // If this is the most recent audit, update the asset's next audit date
    if (body.nextAuditDate) {
      const mostRecentAudit = await prisma.assetAudit.findFirst({
        where: {
          assetId: id,
        },
        orderBy: {
          auditDate: 'desc',
        },
      });

      if (mostRecentAudit && mostRecentAudit.id === auditId) {
        await prisma.asset.update({
          where: {
            id: id,
          },
          data: {
            nextAuditDate: new Date(body.nextAuditDate),
          },
        });
      }
    }

    // If resolving a discrepancy, create a history record
    if (body.discrepancyResolved === true && existingAudit.discrepancyResolved === false) {
      await prisma.assetHistory.create({
        data: {
          assetId: id,
          field: 'Audit Discrepancy Resolved',
          oldValue: 'Unresolved',
          newValue: 'Resolved',
          changedBy: session.user?.name || body.resolvedBy || 'system',
        },
      });
    }

    return Response.json(updatedAudit);
  } catch (error) {
    console.error('Error updating audit:', error);
    return Response.json(
      { error: 'Failed to update audit', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE a specific audit
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; auditId: string }> }
) {
  try {
    // Get session for authentication
    const session = await getServerSession(authOptions);

    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Await params in Next.js 15
    const { id, auditId } = await params;

    // Check if the audit exists
    const existingAudit = await prisma.assetAudit.findUnique({
      where: {
        id: auditId,
        assetId: id,
      },
    });

    if (!existingAudit) {
      return Response.json({ error: 'Audit not found' }, { status: 404 });
    }

    // Delete the audit
    await prisma.assetAudit.delete({
      where: {
        id: auditId,
      },
    });

    // If this was the most recent audit, update the asset's last audit date to the previous audit
    const previousAudit = await prisma.assetAudit.findFirst({
      where: {
        assetId: id,
      },
      orderBy: {
        auditDate: 'desc',
      },
    });

    if (previousAudit) {
      await prisma.asset.update({
        where: {
          id: id,
        },
        data: {
          lastAuditDate: previousAudit.auditDate,
          nextAuditDate: previousAudit.nextAuditDate,
        },
      });
    } else {
      // If no audits remain, clear the last audit date
      await prisma.asset.update({
        where: {
          id: id,
        },
        data: {
          lastAuditDate: null,
          nextAuditDate: null,
        },
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting audit:', error);
    return Response.json(
      { error: 'Failed to delete audit', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
