import { prisma } from '@/lib/prisma';
import { sendNotification } from '@/lib/notifications';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// POST /api/disposals/[id]/reject
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const disposal = await prisma.disposal.update({
      where: { id },
      data: {
        status: 'REJECTED'
      },
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            serialNumber: true,
            purchasePrice: true,
          },
        },
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Send notification to requester
    if (disposal.requester?.id) {
      await sendNotification({
        userId: disposal.requester.id,
        message: `Your disposal request for asset "${disposal.asset.name}" has been rejected.`,
        type: 'disposal_rejected',
        meta: { assetId: disposal.asset.id, disposalId: disposal.id },
      });
    }

    return Response.json(disposal);
  } catch (error) {
    console.error('Error:', error);
    return Response.json(
      { error: 'Failed to reject disposal' },
      { status: 500 }
    );
  }
}
