import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/transfers
import { withRole } from '@/middleware/rbac';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const GET = withRole(['USER', 'MANAGER'], async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (session.user.role === 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    let transfers;
    if (session.user.role === 'MANAGER') {
      transfers = await prisma.transfer.findMany({
        select: {
          id: true,
          assetId: true,
          fromDepartment: true,
          toDepartment: true,
          reason: true,
          status: true,
          createdAt: true,
          requesterId: true,
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
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    }

    // Ensure requesterId is always present at the top level for frontend checks
    const withRequesterId = transfers.map((t: any) => ({
      ...t,
      requesterId: t.requesterId || t.requester?.id || null,
    }));
    return NextResponse.json(withRequesterId);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transfers' },
      { status: 500 }
    );
  }
});

// POST /api/transfers
export const POST = withRole(['USER', 'MANAGER'], async function POST(request: Request) {
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
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
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
        requesterId: session.user.id
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
});
