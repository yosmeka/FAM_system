import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/test/maintenance?assetId=xxx
export async function GET(request: Request) {
  try {
    // Get the assetId from the query parameters
    const url = new URL(request.url);
    const assetId = url.searchParams.get('assetId');
    
    console.log("TEST MAINTENANCE API - Request received for asset:", assetId);
    
    if (!assetId) {
      console.log("TEST MAINTENANCE API - No assetId provided");
      return NextResponse.json({ error: 'assetId is required' }, { status: 400 });
    }
    
    // Get all maintenance records for the asset
    const maintenanceRecords = await prisma.maintenance.findMany({
      where: {
        assetId: assetId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        requester: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });
    
    console.log("TEST MAINTENANCE API - Found records:", maintenanceRecords.length);
    
    return NextResponse.json(maintenanceRecords);
  } catch (error) {
    console.error('Error fetching maintenance records:', error);
    return NextResponse.json(
      { error: 'Failed to fetch maintenance records' },
      { status: 500 }
    );
  }
}
