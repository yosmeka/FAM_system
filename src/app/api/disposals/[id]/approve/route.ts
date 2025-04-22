import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
