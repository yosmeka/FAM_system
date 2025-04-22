import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/transfers/[id]
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const transfer = await prisma.transfer.findUnique({
      where: { id: params.id },
      include: {
        asset: {
          select: {
            name: true,
            serialNumber: true,
          },
        },
      },
    });

    if (!transfer) {
      return NextResponse.json(
        { error: 'Transfer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(transfer);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transfer' },
      { status: 500 }
    );
  }
}

// PUT /api/transfers/[id]
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { status } = body;

    const transfer = await prisma.transfer.update({
      where: { id: params.id },
      data: { status },
    });

    return NextResponse.json(transfer);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to update transfer' },
      { status: 500 }
    );
  }
}
