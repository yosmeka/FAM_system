import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
