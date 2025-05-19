import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET all maintenance records for an asset
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log("MAINTENANCE API - GET request received for asset:", params.id);

    // Get session for authentication
    const session = await getServerSession(authOptions);

    // For testing, we'll allow requests without a session
    if (!session) {
      console.log("MAINTENANCE API - No session found, but continuing for testing");
    } else {
      console.log("MAINTENANCE API - Authorized user:", session.user?.email);
    }

    // Check if the asset exists
    const asset = await prisma.asset.findUnique({
      where: {
        id: params.id,
      },
    });

    if (!asset) {
      console.log("MAINTENANCE API - Asset not found:", params.id);
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    console.log("MAINTENANCE API - Asset found:", asset.name);

    // Get all maintenance records for the asset
    const maintenanceRecords = await prisma.maintenance.findMany({
      where: {
        assetId: params.id,
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

    console.log("MAINTENANCE API - Found records:", maintenanceRecords.length);

    return NextResponse.json(maintenanceRecords);
  } catch (error) {
    console.error('Error fetching maintenance records:', error);
    return NextResponse.json(
      { error: 'Failed to fetch maintenance records' },
      { status: 500 }
    );
  }
}

// POST a new maintenance record for an asset
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get session for authentication
    const session = await getServerSession(authOptions);

    // For testing, we'll allow requests without a session
    if (!session) {
      console.log("MAINTENANCE API POST - No session found, but continuing for testing");
    } else {
      console.log("MAINTENANCE API POST - Authorized user:", session.user?.email);
    }

    // Check if the asset exists
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

    // Validate required fields
    if (!body.description || !body.priority || !body.status) {
      return NextResponse.json(
        { error: 'Missing required fields: description, priority, status' },
        { status: 400 }
      );
    }

    // Get the user ID from the session or use a default for testing
    let userId = session?.user?.id;
    if (!userId) {
      console.log("MAINTENANCE API POST - No user ID found, using default for testing");
      userId = "default-user-id";
    }

    // Create the maintenance record
    // For regular users, always set status to PENDING_APPROVAL
    // Admins and managers can set other statuses
    const userRole = session?.user?.role || 'USER';
    const isAdminOrManager = userRole === 'ADMIN' || userRole === 'MANAGER';

    const maintenance = await prisma.maintenance.create({
      data: {
        assetId: params.id,
        description: body.description,
        priority: body.priority,
        status: isAdminOrManager ? body.status : 'PENDING_APPROVAL',
        cost: body.cost,
        completedAt: body.completedDate ? new Date(body.completedDate) : null,
        requesterId: userId,
        managerId: body.managerId || null, // Add the manager ID
        notes: body.notes,
        scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : null,
      },
      include: {
        requester: {
          select: {
            name: true,
            email: true,
          },
        },
        manager: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // If the status is COMPLETED, update the asset's maintenance dates
    if (body.status === 'COMPLETED') {
      const completionDate = body.completedDate ? new Date(body.completedDate) : new Date();

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

    return NextResponse.json(maintenance);
  } catch (error) {
    console.error('Error creating maintenance record:', error);
    return NextResponse.json(
      { error: 'Failed to create maintenance record' },
      { status: 500 }
    );
  }
}
