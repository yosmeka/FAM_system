import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/disposals
import { withRole } from '@/middleware/rbac';

export const GET = withRole(['MANAGER'], async function GET() {
  try {
    const disposals = await prisma.disposal.findMany({
      include: {
        asset: {
          select: {
            name: true,
            serialNumber: true,
            purchasePrice: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(disposals);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch disposals' },
      { status: 500 }
    );
  }
});

// POST /api/disposals
export const POST = withRole(['MANAGER', 'USER'], async function POST(request: Request) {
  try {
    const body = await request.json();
    const { assetId, reason, method, proceeds } = body;

    // Validate required fields
    if (!assetId || !reason || !method) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create new disposal request
    const disposal = await prisma.disposal.create({
      data: {
        assetId,
        reason,
        method,
        proceeds: proceeds ? parseFloat(proceeds) : null,
        status: 'PENDING',
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
      { error: 'Failed to create disposal request' },
      { status: 500 }
    );
  }
});
