import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/maintenance
import { withRole } from '@/middleware/rbac';

export const GET = withRole(['USER', 'MANAGER'], async function GET(request: Request) {
  try {
    // Get the current user's ID from the session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const userRole = session.user.role;

    // Parse query parameters
    const url = new URL(request.url);
    const status = url.searchParams.get('status');

    // Build the query
    const query: any = {};

    // Role-based filtering
    if (userRole === 'MANAGER') {
      // Managers see requests assigned to them
      query.managerId = userId;
    } else if (userRole === 'USER') {
      // Users (technicians) see requests they created or are assigned to
      query.OR = [
        { requesterId: userId },
        { assignedToId: userId }
      ];
    }
    // Admins can see all requests (no additional filtering)

    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    const maintenanceRequests = await prisma.maintenance.findMany({
      where: query,
      include: {
        asset: {
          select: {
            name: true,
            serialNumber: true,
          },
        },
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
});

// POST /api/maintenance
export const POST = withRole([ 'USER'], async function POST(request: Request) {
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
});
