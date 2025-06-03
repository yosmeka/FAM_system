import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendNotification } from '@/lib/notifications';
import { Prisma } from '@prisma/client';

// POST /api/disposals/[id]/approve
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a manager
    if (session.user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Only managers can approve disposal requests' },
        { status: 403 }
      );
    }

    // Get the disposal request
    const disposal = await prisma.disposal.findUnique({
      where: { id },
      include: {
        asset: true,
        requester: true
      }
    });

    if (!disposal) {
      return NextResponse.json(
        { error: 'Disposal request not found' },
        { status: 404 }
      );
    }

    // Check if the request is still pending
    if (disposal.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Can only approve pending disposal requests' },
        { status: 400 }
      );
    }

    // Start a transaction since we need to update both disposal and asset
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Update the disposal status
      const updatedDisposal = await tx.disposal.update({
        where: { id },
        data: {
          status: 'APPROVED'
        },
        include: {
          asset: true,
          requester: true
        }
      });

      // Update the asset status to DISPOSED
      await tx.asset.update({
        where: { id: disposal.assetId },
        data: {
          status: 'DISPOSED',
          currentValue: 0, // Asset is no longer valuable to the organization
        }
      });

      // Create asset history records
      await tx.assetHistory.createMany({
        data: [
          {
            assetId: disposal.assetId,
            field: 'status',
            oldValue: disposal.asset.status,
            newValue: 'DISPOSED',
            changedBy: session.user.email || 'system',
          },
          {
            assetId: disposal.assetId,
            field: 'currentValue',
            oldValue: disposal.asset.currentValue?.toString() || '0',
            newValue: '0',
            changedBy: session.user.email || 'system',
          }
        ]
      });

      return updatedDisposal;
    });

    // Send notification to requester
    if (result.requester?.id) {
      await sendNotification({
        userId: result.requester.id,
        message: `Your disposal request for asset "${result.asset.name}" has been approved.`,
        type: 'disposal_approved',
        meta: { assetId: result.asset.id, disposalId: result.id },
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error approving disposal:', error);
    return NextResponse.json(
      { error: 'Failed to approve disposal request' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the disposal request
    const disposal = await prisma.disposal.findUnique({
      where: { id: params.id },
      include: { asset: true }
    });

    if (!disposal) {
      return NextResponse.json({ error: 'Disposal not found' }, { status: 404 });
    }

    // Update the disposal status
    const updatedDisposal = await prisma.disposal.update({
      where: { id: params.id },
      data: { status: 'COMPLETED' },
      include: { asset: true }
    });

    // Update the asset's status
    const updatedAsset = await prisma.asset.update({
      where: { id: disposal.assetId },
      data: {
        status: 'DISPOSED',
        currentValue: 0, // Set value to 0 when disposed
      }
    });

    // Track the changes in asset history
    await prisma.assetHistory.createMany({
      data: [
        {
          assetId: disposal.assetId,
          field: 'status',
          oldValue: disposal.asset.status,
          newValue: 'DISPOSED',
          changedBy: session.user?.email || 'system',
        },
        {
          assetId: disposal.assetId,
          field: 'currentValue',
          oldValue: disposal.asset.currentValue.toString(),
          newValue: '0',
          changedBy: session.user?.email || 'system',
        }
      ]
    });

    return NextResponse.json(updatedDisposal);
  } catch (error) {
    console.error('Error approving disposal:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
