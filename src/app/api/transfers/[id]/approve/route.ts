import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { sendNotification } from '@/lib/notifications';

// POST /api/transfers/[id]/approve
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Update the transfer status to APPROVED
    const { id } = await params;
    let reason = '';
    if (request.headers.get('content-type')?.includes('application/json')) {
      try {
        const body = await request.json();
        reason = body.reason || '';
      } catch (e) {
        // Ignore JSON parse error for approval
      }
    }
    const transfer = await prisma.transfer.update({
      where: { id },
      data: {
        status: 'APPROVED',
      },
      include: {
        asset: true,
      },
    });

    // Ensure toDepartment (used as location) is set
    if (!transfer.toDepartment) {
      return NextResponse.json({ error: 'Transfer request missing destination location.' }, { status: 400 });
    }

    // Update asset location and status using toDepartment as the new location
    const updatedAsset = await prisma.asset.update({
      where: { id: transfer.assetId },
      data: {
        status: 'TRANSFERRED',
        location: transfer.toDepartment,
      },
    });

    // Track the change in asset history, but don't fail the main operation if this fails
    try {
      await prisma.assetHistory.create({
        assetId: transfer.assetId,
        field: 'location',
        oldValue: transfer.asset.location || '',
        newValue: transfer.toDepartment,
        changedBy: (await getServerSession(authOptions))?.user?.email || 'system',
      });
    } catch (historyError) {
      console.error('Asset history logging failed:', historyError);
      // Continue without throwing
    }

    // Send notification to requester
    if (transfer.requesterId && transfer.asset?.name) {
      const session = await getServerSession(authOptions);
      await sendNotification({
        userId: transfer.requesterId,
        message: `Your transfer request for asset "${transfer.asset.name}" has been approved by ${session?.user?.name || 'a manager'}.`,
        type: 'transfer_approved',
        meta: { assetId: transfer.asset.id, transferId: transfer.id },
      });
    }
    return NextResponse.json({ transfer, updatedAsset });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to approve transfer' },
      { status: 500 }
    );
  }
}

// PUT /api/transfers/[id]/approve
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the transfer request
    const transfer = await prisma.transfer.findUnique({
      where: { id: params.id },
      include: { asset: true }
    });

    if (!transfer) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    // Update the transfer status
    const updatedTransfer = await prisma.transfer.update({
      where: { id: params.id },
      data: { status: 'COMPLETED' },
      include: { asset: true }
    });

    // Update the asset's department and location
    const updatedAsset = await prisma.asset.update({
      where: { id: transfer.assetId },
      data: {
        department: transfer.toDepartment,
        location: transfer.toDepartment, // Assuming location changes with department
      }
    });

    // Track the changes in asset history
    await prisma.assetHistory.createMany({
      data: [
        {
          assetId: transfer.assetId,
          field: 'department',
          oldValue: transfer.fromDepartment,
          newValue: transfer.toDepartment,
          changedBy: session.user?.email || 'system',
        },
        {
          assetId: transfer.assetId,
          field: 'location',
          oldValue: transfer.fromLocation,
          newValue: transfer.toLocation,
          changedBy: session.user?.email || 'system',
        }
      ]
    });

    // Send notification to requester
    if (transfer.requesterId && transfer.asset?.name) {
      const session = await getServerSession(authOptions);
      await sendNotification({
        userId: transfer.requesterId,
        message: `Your transfer request for asset "${transfer.asset.name}" has been approved by ${session?.user?.name || 'a manager'}.`,
        type: 'transfer_approved',
        meta: { assetId: transfer.asset.id, transferId: transfer.id },
      });
    }
    return NextResponse.json(updatedTransfer);
  } catch (error) {
    console.error('Error approving transfer:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
