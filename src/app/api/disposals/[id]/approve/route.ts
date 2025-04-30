import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// POST /api/disposals/[id]/approve
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Start a transaction since we need to update both disposal and asset
    const result = await prisma.$transaction(async (tx) => {
      // Update the disposal status
      const disposal = await tx.disposal.update({
        where: { id: params.id },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
          // In a real app, get this from the session
          approvedBy: 'user-id',
        },
        include: {
          asset: true,
        },
      });

      // Update the asset status to DISPOSED
      await tx.asset.update({
        where: { id: disposal.assetId },
        data: {
          status: 'DISPOSED',
          currentValue: 0, // Asset is no longer valuable to the organization
        },
      });

      return disposal;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to approve disposal' },
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
