import { prisma } from '@/lib/prisma';
import { sendNotification } from '@/lib/notifications';

// GET /api/transfers
import { withRole } from '@/middleware/rbac';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const GET = withRole(['USER', 'MANAGER'], async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (session.user.role === 'ADMIN') {
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }
    let transfers;
    if (session.user.role === 'MANAGER') {
      transfers = await prisma.transfer.findMany({
        where: { managerId: session.user.id }, // Only show transfers assigned to this manager
        select: {
          id: true,
          assetId: true,
          fromDepartment: true,
          toDepartment: true,
          reason: true,
          status: true,
          createdAt: true,
          requesterId: true,
          managerId: true,
          asset: {
            select: {
              name: true,
              serialNumber: true
            }
          },
          requester: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          manager: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } else {
      // USER: only see their own requests
      transfers = await prisma.transfer.findMany({
        where: { requesterId: session.user.id },
        select: {
          id: true,
          assetId: true,
          fromDepartment: true,
          toDepartment: true,
          reason: true,
          status: true,
          createdAt: true,
          requesterId: true,
          managerId: true,
          asset: {
            select: {
              name: true,
              serialNumber: true
            }
          },
          requester: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          manager: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    }

    // Ensure requesterId is always present at the top level for frontend checks
    const withRequesterId = (transfers as Record<string, unknown>[]).map((t) => {
      const requester = t.requester as { id?: string } | undefined;
      return {
        ...t,
        requesterId: t.requesterId || requester?.id || null,
      };
    });
    return Response.json(withRequesterId);
  } catch (error) {
    console.error('Error:', error);
    return Response.json(
      { error: 'Failed to fetch transfers' },
      { status: 500 }
    );
  }
});

// POST /api/transfers
export const POST = withRole(['USER', 'MANAGER'], async function POST(req: Request) {
  try {
    const body = await req.json();
    const { assetId, fromLocation, toLocation, reason, managerId } = body;

    // Validate required fields
    if (!assetId || !fromLocation || !toLocation || !reason || !managerId) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create new transfer
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const transfer = await prisma.transfer.create({
      data: {
        assetId,
        fromDepartment: fromLocation, // Store as location
        toDepartment: toLocation,     // Store as location
        reason,
        status: 'PENDING',
        requesterId: session.user.id,
        managerId,
      }
    });

    // Notify only the selected manager
    try {
      const asset = await prisma.asset.findUnique({ where: { id: assetId } });
      const requester = await prisma.user.findUnique({ where: { id: session.user.id } });
      await sendNotification({
        userId: managerId,
        message: `New transfer request for asset "${asset?.name || 'Asset'}" from ${requester?.name || requester?.email || 'User'}.`,
        type: 'transfer_request',
        meta: {
          assetId,
          transferId: transfer.id,
          requesterId: session.user.id,
          fromLocation,
          toLocation,
          reason,
        },
      });
    } catch (notifyError) {
      console.error('Failed to send notification to manager:', notifyError);
    }

    return Response.json(transfer);
  } catch (error) {
    console.error('Error:', error);
    return Response.json(
      { error: 'Failed to create transfer' },
      { status: 500 }
    );
  }
});
