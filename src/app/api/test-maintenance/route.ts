import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Simple test endpoint to fetch maintenance data
export async function GET() {
  try {
    // Fetch all maintenance records
    const maintenanceRecords = await prisma.maintenance.findMany({
      include: {
        asset: {
          select: {
            name: true,
            serialNumber: true,
            department: true,
          },
        },
        requester: {
          select: {
            name: true,
          },
        },
        manager: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20, // Limit to 20 records for testing
    });

    // Count total records
    const totalCount = await prisma.maintenance.count();

    return NextResponse.json({
      success: true,
      count: maintenanceRecords.length,
      totalCount,
      data: maintenanceRecords,
    });
  } catch (error) {
    console.error('Error fetching maintenance data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch maintenance data',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
