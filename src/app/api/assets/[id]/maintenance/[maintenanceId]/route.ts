import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET a specific maintenance record
export async function GET(
  request: Request,
  { params }: { params: { id: string; maintenanceId: string } }
) {
  try {
    // Get session for authentication
    const session = await getServerSession(authOptions);

    // For testing, we'll allow requests without a session
    if (!session) {
      console.log("MAINTENANCE RECORD API - No session found, but continuing for testing");
    } else {
      console.log("MAINTENANCE RECORD API - Authorized user:", session.user?.email);
    }

    // Check if the maintenance record exists
    const maintenance = await prisma.maintenance.findUnique({
      where: {
        id: params.maintenanceId,
        assetId: params.id,
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

    if (!maintenance) {
      return NextResponse.json({ error: 'Maintenance record not found' }, { status: 404 });
    }

    return NextResponse.json(maintenance);
  } catch (error) {
    console.error('Error fetching maintenance record:', error);
    return NextResponse.json(
      { error: 'Failed to fetch maintenance record' },
      { status: 500 }
    );
  }
}

// PUT (update) a specific maintenance record
export async function PUT(
  request: Request,
  { params }: { params: { id: string; maintenanceId: string } }
) {
  try {
    // Get session for authentication
    const session = await getServerSession(authOptions);

    // For testing, we'll allow requests without a session
    if (!session) {
      console.log("MAINTENANCE RECORD PUT API - No session found, but continuing for testing");
    } else {
      console.log("MAINTENANCE RECORD PUT API - Authorized user:", session.user?.email);
    }

    // Check if the maintenance record exists
    const existingMaintenance = await prisma.maintenance.findUnique({
      where: {
        id: params.maintenanceId,
        assetId: params.id,
      },
    });

    if (!existingMaintenance) {
      return NextResponse.json({ error: 'Maintenance record not found' }, { status: 404 });
    }

    // Get the asset
    const asset = await prisma.asset.findUnique({
      where: {
        id: params.id,
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Parse the request body
    const body = await request.json();

    // Prepare update data
    const updateData: any = {
      description: body.description,
      priority: body.priority,
      status: body.status,
      cost: body.cost,
    };

    // Handle completion date if status is COMPLETED
    const wasCompleted = existingMaintenance.status === 'COMPLETED';
    const isNowCompleted = body.status === 'COMPLETED';

    if (isNowCompleted) {
      updateData.completedAt = body.completedDate ? new Date(body.completedDate) : new Date();
    }

    // Update the maintenance record
    const updatedMaintenance = await prisma.maintenance.update({
      where: {
        id: params.maintenanceId,
      },
      data: updateData,
      include: {
        requester: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // If the status changed to COMPLETED, update the asset's maintenance dates
    if (!wasCompleted && isNowCompleted) {
      const completionDate = updateData.completedAt;

      // Calculate next maintenance date (3 months from completion by default)
      const nextMaintenanceDate = new Date(completionDate);
      nextMaintenanceDate.setMonth(nextMaintenanceDate.getMonth() + 3);

      await prisma.asset.update({
        where: {
          id: params.id,
        },
        data: {
          lastMaintenance: completionDate,
          nextMaintenance: nextMaintenanceDate,
        },
      });

      // Create asset history records
      await prisma.assetHistory.createMany({
        data: [
          {
            assetId: params.id,
            field: 'lastMaintenance',
            oldValue: asset.lastMaintenance ? asset.lastMaintenance.toISOString() : null,
            newValue: completionDate.toISOString(),
            changedBy: session.user?.email || 'system',
          },
          {
            assetId: params.id,
            field: 'nextMaintenance',
            oldValue: asset.nextMaintenance ? asset.nextMaintenance.toISOString() : null,
            newValue: nextMaintenanceDate.toISOString(),
            changedBy: session.user?.email || 'system',
          },
        ],
      });
    }

    return NextResponse.json(updatedMaintenance);
  } catch (error) {
    console.error('Error updating maintenance record:', error);
    return NextResponse.json(
      { error: 'Failed to update maintenance record' },
      { status: 500 }
    );
  }
}

// DELETE a specific maintenance record
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; maintenanceId: string } }
) {
  try {
    // Get session for authentication
    const session = await getServerSession(authOptions);

    // For testing, we'll allow requests without a session
    if (!session) {
      console.log("MAINTENANCE RECORD DELETE API - No session found, but continuing for testing");
    } else {
      console.log("MAINTENANCE RECORD DELETE API - Authorized user:", session.user?.email);
    }

    // Check if the maintenance record exists
    const maintenance = await prisma.maintenance.findUnique({
      where: {
        id: params.maintenanceId,
        assetId: params.id,
      },
    });

    if (!maintenance) {
      return NextResponse.json({ error: 'Maintenance record not found' }, { status: 404 });
    }

    // Delete the maintenance record
    await prisma.maintenance.delete({
      where: {
        id: params.maintenanceId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting maintenance record:', error);
    return NextResponse.json(
      { error: 'Failed to delete maintenance record' },
      { status: 500 }
    );
  }
}
