import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/transfers
export async function GET() {
  try {
    const transfers = await prisma.transfer.findMany({
      include: {
        asset: {
          select: {
            name: true,
            serialNumber: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(transfers);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transfers' },
      { status: 500 }
    );
  }
}

// POST /api/transfers
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { assetId, fromLocation, toLocation, reason } = body;

    // Validate required fields
    if (!assetId || !fromLocation || !toLocation || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create new transfer
    const transfer = await prisma.transfer.create({
      data: {
        assetId,
        fromLocation,
        toLocation,
        reason,
        status: 'PENDING'
      }
    });

    return NextResponse.json(transfer);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to create transfer' },
      { status: 500 }
    );
  }
}
