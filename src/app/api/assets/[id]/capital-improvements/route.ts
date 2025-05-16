import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET all capital improvements for an asset
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get session for authentication
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // Get all capital improvements for the asset
    const capitalImprovements = await prisma.capitalImprovement.findMany({
      where: {
        assetId: params.id,
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
  { params }: { params: { id: string } }
) {
  try {
    // Get session for authentication
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    if (!body.description || !body.improvementDate || !body.cost) {
      return NextResponse.json(
        { error: 'Missing required fields: description, improvementDate, cost' },
        { status: 400 }
      );
    }

    // Create the capital improvement
    const capitalImprovement = await prisma.capitalImprovement.create({
      data: {
        assetId: params.id,
        description: body.description,
        improvementDate: new Date(body.improvementDate),
        cost: parseFloat(body.cost),
        usefulLifeMonths: null, // No longer using separate useful life for improvements
        depreciationMethod: null, // No longer using separate depreciation method for improvements
        notes: body.notes || null,
      },
    });

    // Update the asset's current value to include the improvement cost
    await prisma.asset.update({
      where: {
        id: params.id,
      },
      data: {
        currentValue: {
          increment: parseFloat(body.cost),
        },
        // Also update the depreciable cost if it exists
        depreciableCost: asset.depreciableCost
          ? { increment: parseFloat(body.cost) }
          : undefined,
      },
    });

    // Create an asset history record
    await prisma.assetHistory.create({
      data: {
        assetId: params.id,
        field: 'Capital Improvement',
        oldValue: asset.currentValue.toString(),
        newValue: (asset.currentValue + parseFloat(body.cost)).toString(),
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
