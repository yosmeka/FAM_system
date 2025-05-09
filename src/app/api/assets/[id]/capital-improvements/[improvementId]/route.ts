import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET a specific capital improvement
export async function GET(
  request: Request,
  { params }: { params: { id: string; improvementId: string } }
) {
  try {
    // Get session for authentication
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the capital improvement exists
    const capitalImprovement = await prisma.capitalImprovement.findUnique({
      where: {
        id: params.improvementId,
        assetId: params.id,
      },
    });

    if (!capitalImprovement) {
      return NextResponse.json({ error: 'Capital improvement not found' }, { status: 404 });
    }

    return NextResponse.json(capitalImprovement);
  } catch (error) {
    console.error('Error fetching capital improvement:', error);
    return NextResponse.json(
      { error: 'Failed to fetch capital improvement' },
      { status: 500 }
    );
  }
}

// PUT (update) a specific capital improvement
export async function PUT(
  request: Request,
  { params }: { params: { id: string; improvementId: string } }
) {
  try {
    // Get session for authentication
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the capital improvement exists
    const existingImprovement = await prisma.capitalImprovement.findUnique({
      where: {
        id: params.improvementId,
        assetId: params.id,
      },
    });

    if (!existingImprovement) {
      return NextResponse.json({ error: 'Capital improvement not found' }, { status: 404 });
    }

    // Parse the request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.description || !body.improvementDate || !body.cost) {
      return NextResponse.json(
        { error: 'Missing required fields: description, improvementDate, cost' },
        { status: 400 }
      );
    }

    // Calculate the cost difference to update the asset value
    const costDifference = parseFloat(body.cost) - existingImprovement.cost;

    // Update the capital improvement
    const updatedImprovement = await prisma.capitalImprovement.update({
      where: {
        id: params.improvementId,
      },
      data: {
        description: body.description,
        improvementDate: new Date(body.improvementDate),
        cost: parseFloat(body.cost),
        usefulLifeMonths: body.usefulLifeMonths ? parseInt(body.usefulLifeMonths) : null,
        depreciationMethod: body.depreciationMethod || null,
        notes: body.notes || null,
      },
    });

    // Only update the asset value if the cost has changed
    if (costDifference !== 0) {
      // Get the current asset
      const asset = await prisma.asset.findUnique({
        where: {
          id: params.id,
        },
      });

      if (asset) {
        // Update the asset's current value to reflect the change in improvement cost
        await prisma.asset.update({
          where: {
            id: params.id,
          },
          data: {
            currentValue: {
              increment: costDifference,
            },
            // Also update the depreciable cost if it exists
            depreciableCost: asset.depreciableCost 
              ? { increment: costDifference } 
              : undefined,
          },
        });

        // Create an asset history record for the value change
        await prisma.assetHistory.create({
          data: {
            assetId: params.id,
            field: 'Capital Improvement Update',
            oldValue: asset.currentValue.toString(),
            newValue: (asset.currentValue + costDifference).toString(),
            changedBy: session.user?.name || 'system',
          },
        });
      }
    }

    return NextResponse.json(updatedImprovement);
  } catch (error) {
    console.error('Error updating capital improvement:', error);
    return NextResponse.json(
      { error: 'Failed to update capital improvement', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE a specific capital improvement
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; improvementId: string } }
) {
  try {
    // Get session for authentication
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the capital improvement exists
    const existingImprovement = await prisma.capitalImprovement.findUnique({
      where: {
        id: params.improvementId,
        assetId: params.id,
      },
    });

    if (!existingImprovement) {
      return NextResponse.json({ error: 'Capital improvement not found' }, { status: 404 });
    }

    // Get the current asset
    const asset = await prisma.asset.findUnique({
      where: {
        id: params.id,
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Delete the capital improvement
    await prisma.capitalImprovement.delete({
      where: {
        id: params.improvementId,
      },
    });

    // Update the asset's current value to remove the improvement cost
    await prisma.asset.update({
      where: {
        id: params.id,
      },
      data: {
        currentValue: {
          decrement: existingImprovement.cost,
        },
        // Also update the depreciable cost if it exists
        depreciableCost: asset.depreciableCost 
          ? { decrement: existingImprovement.cost } 
          : undefined,
      },
    });

    // Create an asset history record
    await prisma.assetHistory.create({
      data: {
        assetId: params.id,
        field: 'Capital Improvement Removed',
        oldValue: asset.currentValue.toString(),
        newValue: (asset.currentValue - existingImprovement.cost).toString(),
        changedBy: session.user?.name || 'system',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting capital improvement:', error);
    return NextResponse.json(
      { error: 'Failed to delete capital improvement', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
