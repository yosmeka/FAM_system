import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/middleware/rbac';

// PUT /api/maintenance/[id]/approve
export const PUT = withRole(['ADMIN', 'MANAGER'], async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { status, notes, scheduledDate } = body;

    console.log('Approval request body:', body);

    // Validate the status
    if (status !== 'APPROVED' && status !== 'REJECTED') {
      return NextResponse.json(
        { error: 'Invalid status. Must be APPROVED or REJECTED' },
        { status: 400 }
      );
    }

    // Get the maintenance request
    const maintenance = await prisma.maintenance.findUnique({
      where: { id: params.id },
      include: { asset: true }
    });

    if (!maintenance) {
      return NextResponse.json({ error: 'Maintenance request not found' }, { status: 404 });
    }

    // Check if the maintenance request is in the correct state
    if (maintenance.status !== 'PENDING_APPROVAL') {
      return NextResponse.json(
        { error: 'Maintenance request is not in PENDING_APPROVAL state' },
        { status: 400 }
      );
    }

    // Update the maintenance request
    const updateData: any = {
      status,
      notes,
    };

    // If approved, set the scheduled date
    if (status === 'APPROVED' && scheduledDate) {
      updateData.scheduledDate = new Date(scheduledDate);
    }

    console.log('Updating maintenance with data:', updateData);

    const updatedMaintenance = await prisma.maintenance.update({
      where: { id: params.id },
      data: updateData,
      include: {
        asset: true,
        requester: {
          select: {
            name: true,
            email: true,
          }
        },
        manager: {
          select: {
            name: true,
            email: true,
          }
        }
      }
    });

    console.log('Updated maintenance:', updatedMaintenance);

    // If approved, update the asset's next maintenance date
    if (status === 'APPROVED' && scheduledDate) {
      await prisma.asset.update({
        where: { id: maintenance.assetId },
        data: {
          nextMaintenance: new Date(scheduledDate),
        },
      });

      // Track the changes in asset history
      await prisma.assetHistory.create({
        data: {
          assetId: maintenance.assetId,
          field: 'nextMaintenance',
          oldValue: maintenance.asset.nextMaintenance?.toISOString() || null,
          newValue: new Date(scheduledDate).toISOString(),
          changedBy: session.user?.email || 'system',
        }
      });
    }

    // Create a notification for the requester
    // This is a placeholder - you would implement your notification system here
    console.log(`Maintenance request ${status.toLowerCase()} notification would be sent to ${updatedMaintenance.requester?.email}`);

    return NextResponse.json(updatedMaintenance);
  } catch (error) {
    console.error('Error approving/rejecting maintenance request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
