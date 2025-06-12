import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/disposals
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Fetching disposals for user:', session.user.id, 'with role:', session.user.role);

    // If user is a MANAGER, show all disposals
    // If user is a USER, show only their disposals
    const disposals = await prisma.disposal.findMany({
      where: session.user.role === 'MANAGER' ? {} : {
        requester: {
          id: session.user.id
        }
      },
      include: {
        asset: {
          select: {
            name: true,
            serialNumber: true,
            purchasePrice: true,
          },
        },
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log('Found disposals:', disposals.length);
    return Response.json(disposals);
  } catch (error) {
    console.error('Error fetching disposals:', error);
    return Response.json(
      { error: 'Failed to fetch disposals' },
      { status: 500 }
    );
  }
}

// POST /api/disposals
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Received disposal request data:', body);
    const { assetId, reason, method, proceeds } = body;

    // Validate required fields
    if (!assetId || !reason || !method) {
      console.error('Missing required fields:', { assetId, reason, method });
      return Response.json(
        { error: 'Missing required fields', details: { assetId, reason, method } },
        { status: 400 }
      );
    }

    // Check if the asset exists and is not already disposed
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      select: { status: true }
    });

    if (!asset) {
      console.error('Asset not found:', assetId);
      return Response.json(
        { error: 'Asset not found' },
        { status: 404 }
      );
    }

    if (asset.status === 'DISPOSED') {
      console.error('Asset already disposed:', assetId);
      return Response.json(
        { error: 'Asset is already disposed' },
        { status: 400 }
      );
    }

    // Create new disposal request
    const disposal = await prisma.disposal.create({
      data: {
        reason,
        method,
        expectedValue: proceeds ? parseFloat(proceeds) : 0,
        status: 'PENDING',
        asset: {
          connect: {
            id: assetId
          }
        },
        requester: {
          connect: {
            id: session.user.id
          }
        }
      },
      include: {
        asset: {
          select: {
            name: true,
            serialNumber: true,
            purchasePrice: true,
          },
        },
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Create notifications for all managers
    const managers = await prisma.user.findMany({
      where: {
        role: 'MANAGER'
      },
      select: {
        id: true
      }
    });

    // Create notifications for each manager
    await Promise.all(managers.map((manager: { id: string }) =>
      (prisma as any).notification.create({
        data: {
          userId: manager.id,
          type: 'NEW_DISPOSAL',
          message: `New disposal request for asset "${disposal.asset.name}" from ${disposal.requester.name}`,
          read: false
        }
      })
    ));

    console.log('Successfully created disposal request:', disposal);
    return Response.json(disposal);
  } catch (error: any) {
    console.error('Error creating disposal request:', error);
    return Response.json(
      {
        error: 'Failed to create disposal request',
        details: error.message,
        code: error.code
      },
      { status: 500 }
    );
  }
}
