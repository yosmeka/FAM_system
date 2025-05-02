import { NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { PrismaClient } from '@prisma/client';

// POST /api/disposals/[id]/approve
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Start a transaction since we need to update both disposal and asset
    let disposal;
    try {
      // Update the disposal status
      disposal = await prisma.disposal.update({
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
      const asset = await prisma.asset.update({
        where: { id: disposal.assetId },
        data: {
          status: 'DISPOSED',
          currentValue: 0, // Asset is no longer valuable to the organization
        },
      });
    } catch (error) {
      console.error('Error updating asset:', error);
      // Revert the disposal update
      await prisma.disposal.update({
        where: { id: params.id },
        data: {
          status: 'PENDING',
          approvedAt: null,
          approvedBy: null,
        },
      });
      throw error;
    }

    return NextResponse.json(disposal!);
  } catch (error) {
    console.error('Error updating disposal or asset:', error);
    return NextResponse.json(
      { error: 'Failed to approve disposal' },
      { status: 500 }
    );
  }
}
