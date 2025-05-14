import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { sendNotification } from '@/lib/notifications';

// POST /api/transfers/[id]/reject
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const body = await request.json();
    const reason = body.reason || '';
    const transfer = await prisma.transfer.update({
      where: { id },
      data: { status: 'REJECTED', managerReason: reason },
      include: { asset: true },
    });
    // Send notification to requester
    if (transfer.requesterId && transfer.asset?.name) {
      await sendNotification({
        userId: transfer.requesterId,
        message: `Your transfer request for asset "${transfer.asset.name}" has been rejected by ${session?.user?.name || 'a manager'}.`,
        type: 'transfer_rejected',
        meta: { assetId: transfer.asset.id, transferId: transfer.id },
      });
    }
    return NextResponse.json(transfer);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to reject transfer' },
      { status: 500 }
    );
  }
}
