import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/disposals/[id]
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const disposal = await prisma.disposal.findUnique({
      where: { id: params.id },
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

    if (!disposal) {
      return NextResponse.json(
        { error: 'Disposal request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(disposal);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch disposal request' },
      { status: 500 }
    );
  }
}

// PUT /api/disposals/[id]
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { status, proceeds } = body;

    const disposal = await prisma.disposal.update({
      where: { id: params.id },
      data: {
        status,
        proceeds: proceeds ? parseFloat(proceeds) : null,
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
      { error: 'Failed to update disposal request' },
      { status: 500 }
    );
  }
}
