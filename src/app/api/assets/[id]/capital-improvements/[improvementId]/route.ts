import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET a specific capital improvement
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; improvementId: string }> }
): Promise<Response> {
  try {
    // Get session for authentication
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract the IDs from the context
    const { id: assetId, improvementId } = await context.params;

    // Check if the capital improvement exists
    const capitalImprovement = await prisma.capitalImprovement.findUnique({
      where: {
        id: improvementId,
        assetId: assetId,
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
  context: { params: Promise<{ id: string; improvementId: string }> }
): Promise<Response> {
  try {
    // Get session for authentication
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract the IDs from the context
    const { id: assetId, improvementId } = await context.params;

    // Check if the capital improvement exists
    const existingImprovement = await prisma.capitalImprovement.findUnique({
      where: {
        id: improvementId,
        assetId: assetId,
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
        id: improvementId,
      },
      data: {
        description: body.description,
        improvementDate: new Date(body.improvementDate),
        cost: parseFloat(body.cost),
        usefulLifeMonths: null, // No longer using separate useful life for improvements
        depreciationMethod: null, // No longer using separate depreciation method for improvements
        notes: body.notes || null,
      },
    });

    // Only update the depreciable cost if the cost has changed
    if (costDifference !== 0) {
      // Get the current asset
      const asset = await prisma.asset.findUnique({
        where: {
          id: assetId,
        },
      });

      if (asset) {
        let newDepreciableCost: number;

        // If a current asset value was provided in the request, use it as the base
        if (body.currentAssetValue) {
          // Extract the numeric value from the currency string (remove $ and commas)
          const currentValueString = body.currentAssetValue.replace(/[$,]/g, '');
          const currentDepreciatedCost = parseFloat(currentValueString);

          // If we have a valid number, use it as the base and add the cost difference
          if (!isNaN(currentDepreciatedCost)) {
            // Calculate the new depreciable cost by adding the cost difference
            newDepreciableCost = currentDepreciatedCost + costDifference;

            // Update only the depreciable cost field
            await prisma.asset.update({
              where: {
                id: assetId,
              },
              data: {
                depreciableCost: newDepreciableCost,
              },
            });
          } else {
            // If the current value string couldn't be parsed, fall back to adjusting existing depreciable cost
            newDepreciableCost = (asset.depreciableCost || asset.purchasePrice) + costDifference;

            await prisma.asset.update({
              where: {
                id: assetId,
              },
              data: {
                depreciableCost: newDepreciableCost,
              },
            });
          }
        } else {
          // If no current value was provided, just adjust the existing depreciable cost
          newDepreciableCost = (asset.depreciableCost || asset.purchasePrice) + costDifference;

          await prisma.asset.update({
            where: {
              id: assetId,
            },
            data: {
              depreciableCost: newDepreciableCost,
            },
          });
        }

        // Create an asset history record for the depreciable cost change
        await prisma.assetHistory.create({
          data: {
            assetId: assetId,
            field: 'Capital Improvement Update - Depreciable Cost',
            oldValue: body.currentAssetValue || (asset.depreciableCost || asset.purchasePrice).toString(),
            newValue: newDepreciableCost.toString(),
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
  context: { params: Promise<{ id: string; improvementId: string }> }
): Promise<Response> {
  try {
    // Get session for authentication
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract the IDs from the context
    const { id: assetId, improvementId } = await context.params;

    // Check if the capital improvement exists
    const existingImprovement = await prisma.capitalImprovement.findUnique({
      where: {
        id: improvementId,
        assetId: assetId,
      },
    });

    if (!existingImprovement) {
      return NextResponse.json({ error: 'Capital improvement not found' }, { status: 404 });
    }

    // Get the current asset
    const asset = await prisma.asset.findUnique({
      where: {
        id: assetId,
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Delete the capital improvement
    await prisma.capitalImprovement.delete({
      where: {
        id: improvementId,
      },
    });

    // Update only the depreciable cost to remove the improvement cost
    const newDepreciableCost = (asset.depreciableCost || asset.purchasePrice) - existingImprovement.cost;

    await prisma.asset.update({
      where: {
        id: assetId,
      },
      data: {
        depreciableCost: newDepreciableCost,
      },
    });

    // Create an asset history record
    await prisma.assetHistory.create({
      data: {
        assetId: assetId,
        field: 'Capital Improvement Removed - Depreciable Cost',
        oldValue: (asset.depreciableCost || asset.purchasePrice).toString(),
        newValue: newDepreciableCost.toString(),
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
