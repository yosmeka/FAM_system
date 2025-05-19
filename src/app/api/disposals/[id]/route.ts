import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/disposals/[id]
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  try {
    const disposal = await prisma.disposal.findUnique({
      where: { id },
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

    if (!disposal) {
      return NextResponse.json(
        { error: 'Disposal request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(disposal);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch disposal request' },
      { status: 500 }
    );
  }
}

// PUT /api/disposals/[id]
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the disposal request to check ownership
    const existingDisposal = await prisma.disposal.findUnique({
      where: { id },
      select: { requesterId: true, status: true }
    });

    if (!existingDisposal) {
      return NextResponse.json(
        { error: 'Disposal request not found' },
        { status: 404 }
      );
    }

    // Check if the user is the owner of the request
    if (existingDisposal.requesterId !== session.user.id) {
      return NextResponse.json(
        { error: 'You can only edit your own disposal requests' },
        { status: 403 }
      );
    }

    // Check if the request is still pending
    if (existingDisposal.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Can only edit pending disposal requests' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { method, reason, expectedValue } = body;

    // Validate the disposal method
    const validMethods = ['SALE', 'DONATION', 'RECYCLE', 'SCRAP'] as const;
    if (!validMethods.includes(method)) {
      return NextResponse.json(
        { error: 'Invalid disposal method. Must be one of: SALE, DONATION, RECYCLE, SCRAP' },
        { status: 400 }
      );
    }

    const disposal = await prisma.disposal.update({
      where: { id },
      data: {
        method,
        reason,
        expectedValue: parseFloat(expectedValue),
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

    return NextResponse.json(disposal);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to update disposal request' },
      { status: 500 }
    );
  }
}

// DELETE /api/disposals/[id]
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the disposal request to check ownership
    const disposal = await prisma.disposal.findUnique({
      where: { id },
      select: { requesterId: true, status: true }
    });

    if (!disposal) {
      return NextResponse.json(
        { error: 'Disposal request not found' },
        { status: 404 }
      );
    }

    // Check if the user is the owner of the request
    if (disposal.requesterId !== session.user.id) {
      return NextResponse.json(
        { error: 'You can only delete your own disposal requests' },
        { status: 403 }
      );
    }

    // Check if the request is still pending
    if (disposal.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Can only delete pending disposal requests' },
        { status: 400 }
      );
    }

    // Delete the disposal request
    await prisma.disposal.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Disposal request deleted successfully' });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete disposal request' },
      { status: 500 }
    );
  }
}
