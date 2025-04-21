import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/maintenance
export async function GET() {
  try {
    const maintenanceRequests = await prisma.maintenance.findMany({
      include: {
        asset: {
          select: {
            name: true,
            serialNumber: true,
          },
        },
        requestedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(maintenanceRequests);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch maintenance requests' },
      { status: 500 }
    );
  }
}

// POST /api/maintenance
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { assetId, description, requestedById } = body;

    // Validate required fields
    if (!assetId || !description || !requestedById) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create new maintenance request
    const maintenanceRequest = await prisma.maintenance.create({
      data: {
        assetId,
        description,
        requestedById,
        status: 'PENDING',
      },
      include: {
        asset: {
          select: {
            name: true,
            serialNumber: true,
          },
        },
        requestedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(maintenanceRequest);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to create maintenance request' },
      { status: 500 }
    );
  }
}
