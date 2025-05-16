import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET all capital improvements for an asset
export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    // Get session for authentication
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract the asset ID from the context
    const assetId = context.params.id;

    // Check if the asset exists
    const asset = await prisma.asset.findUnique({
      where: {
        id: assetId,
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Get all capital improvements for the asset
    const capitalImprovements = await prisma.capitalImprovement.findMany({
      where: {
        assetId: assetId,
      },
      orderBy: {
        improvementDate: 'desc',
      },
    });

    return NextResponse.json(capitalImprovements);
  } catch (error) {
    console.error('Error fetching capital improvements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch capital improvements' },
      { status: 500 }
    );
  }
}

// POST a new capital improvement
export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    // Get session for authentication
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract the asset ID from the context
    const assetId = context.params.id;

    // Check if the asset exists
    const asset = await prisma.asset.findUnique({
      where: {
        id: assetId,
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
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

    // Create the capital improvement
    const capitalImprovement = await prisma.capitalImprovement.create({
      data: {
        assetId: assetId,
        description: body.description,
        improvementDate: new Date(body.improvementDate),
        cost: parseFloat(body.cost),
        usefulLifeMonths: null, // No longer using separate useful life for improvements
        depreciationMethod: null, // No longer using separate depreciation method for improvements
        notes: body.notes || null,
      },
    });

    // Determine the new depreciable cost
    let newDepreciableCost: number;

    // If a current asset value was provided in the request, use it as the base
    if (body.currentAssetValue) {
      // Extract the numeric value from the currency string (remove $ and commas)
      const currentValueString = body.currentAssetValue.replace(/[$,]/g, '');
      const currentDepreciatedCost = parseFloat(currentValueString);

      // If we have a valid number, use it as the base and add the improvement cost
      if (!isNaN(currentDepreciatedCost)) {
        newDepreciableCost = currentDepreciatedCost + parseFloat(body.cost);

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
        // If the current value string couldn't be parsed, fall back to incrementing existing depreciable cost
        newDepreciableCost = (asset.depreciableCost || asset.purchasePrice) + parseFloat(body.cost);

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
      // If no current value was provided, just add to the existing depreciable cost
      newDepreciableCost = (asset.depreciableCost || asset.purchasePrice) + parseFloat(body.cost);

      await prisma.asset.update({
        where: {
          id: assetId,
        },
        data: {
          depreciableCost: newDepreciableCost,
        },
      });
    }

    // Create an asset history record
    await prisma.assetHistory.create({
      data: {
        assetId: assetId,
        field: 'Capital Improvement - Depreciable Cost',
        oldValue: body.currentAssetValue || (asset.depreciableCost || asset.purchasePrice).toString(),
        newValue: newDepreciableCost.toString(),
        changedBy: session.user?.name || 'system',
      },
    });

    return NextResponse.json(capitalImprovement, { status: 201 });
  } catch (error) {
    console.error('Error creating capital improvement:', error);
    return NextResponse.json(
      { error: 'Failed to create capital improvement', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
