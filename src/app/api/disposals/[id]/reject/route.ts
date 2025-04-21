import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    return NextResponse.json(disposal);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to reject disposal' },
      { status: 500 }
    );
  }
}
