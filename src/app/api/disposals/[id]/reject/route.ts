import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendNotification } from '@/lib/notifications';

// POST /api/disposals/[id]/reject
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const disposal = await prisma.disposal.update({
      where: { id: params.id },
      data: {
        status: 'REJECTED',
        approvedAt: new Date(),
        // In a real app, get this from the session
        approvedBy: 'user-id',
      },
      include: {
        asset: {
          select: {
            name: true,
            serialNumber: true,
            purchasePrice: true,
          },
        },
      },
    });

    // Send notification to requester (if available)
    if (disposal?.requestedById && disposal?.asset?.name) {
      await sendNotification({
        userId: disposal.requestedById,
        message: `Your disposal request for asset "${disposal.asset.name}" has been rejected.`,
        type: 'disposal_rejected',
        meta: { assetId: disposal.asset.id, disposalId: disposal.id },
      });
    }
    return NextResponse.json(disposal);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to reject disposal' },
      { status: 500 }
    );
  }
}
