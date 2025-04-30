import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// POST /api/transfers/[id]/approve
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const transfer = await prisma.transfer.update({
      where: { id: params.id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
      },
      include: {
        asset: true,
      },
    });

    // Update the asset's location
    await prisma.asset.update({
      where: { id: transfer.assetId },
      data: {
        location: transfer.toLocation,
      },
    });

    return NextResponse.json(transfer);
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
          oldValue: transfer.fromDepartment,
          newValue: transfer.toDepartment,
          changedBy: session.user?.email || 'system',
        }
      ]
    });

    return NextResponse.json(updatedTransfer);
  } catch (error) {
    console.error('Error approving transfer:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
