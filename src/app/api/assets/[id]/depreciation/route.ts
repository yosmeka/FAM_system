import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateDepreciation, generateChartData } from '@/utils/depreciation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get URL to parse query parameters
    const url = new URL(request.url);

    // Fetch the asset with its depreciation settings
    const asset = await prisma.asset.findUnique({
      where: {
        id: params.id,
      },
      select: {
        id: true,
        name: true,
        purchaseDate: true,
        purchasePrice: true,
        currentValue: true,
        depreciableCost: true,
        salvageValue: true,
        usefulLifeMonths: true,
        depreciationMethod: true,
        depreciationStartDate: true,
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Check if we have query parameters for recalculation
    const queryUsefulLife = url.searchParams.get('usefulLife');
    const querySalvageValue = url.searchParams.get('salvageValue');
    const queryMethod = url.searchParams.get('method');
    const queryDepreciationRate = url.searchParams.get('depreciationRate');
    const queryDepreciableCost = url.searchParams.get('depreciableCost');
    const queryDateAcquired = url.searchParams.get('dateAcquired');

    // Use query parameters if provided, otherwise use asset's settings
    const depreciableCost = queryDepreciableCost
      ? parseFloat(queryDepreciableCost)
      : (asset.depreciableCost || asset.purchasePrice);

    const salvageValue = querySalvageValue
      ? parseFloat(querySalvageValue)
      : (asset.salvageValue || asset.purchasePrice * 0.1); // Default to 10% of purchase price

    const usefulLifeYears = queryUsefulLife
      ? parseInt(queryUsefulLife)
      : (asset.usefulLifeMonths ? Math.ceil(asset.usefulLifeMonths / 12) : 5); // Default to 5 years

    const depreciationMethod = queryMethod
      ? queryMethod
      : (asset.depreciationMethod || 'STRAIGHT_LINE');

    const depreciationRate = queryDepreciationRate
      ? parseInt(queryDepreciationRate)
      : (depreciationMethod === 'DOUBLE_DECLINING' ? 40 : 20); // 40% for double declining, 20% for regular declining

    const startDate = queryDateAcquired
      ? new Date(queryDateAcquired)
      : (asset.depreciationStartDate || asset.purchaseDate);

    // Calculate depreciation
    const depreciationResults = calculateDepreciation({
      purchasePrice: depreciableCost,
      purchaseDate: startDate.toISOString(),
      usefulLife: usefulLifeYears,
      salvageValue: salvageValue,
      method: depreciationMethod === 'STRAIGHT_LINE' ? 'STRAIGHT_LINE' : 'DECLINING_BALANCE',
      depreciationRate: depreciationRate,
    });

    // Generate chart data
    const chartData = generateChartData(depreciationResults);

    // Return the depreciation data
    return NextResponse.json({
      asset: {
        id: asset.id,
        name: asset.name,
        purchaseDate: asset.purchaseDate,
        purchasePrice: asset.purchasePrice,
        currentValue: asset.currentValue,
      },
      depreciationSettings: {
        depreciableCost,
        salvageValue,
        usefulLifeYears,
        usefulLifeMonths: asset.usefulLifeMonths || usefulLifeYears * 12,
        depreciationMethod,
        depreciationRate,
        startDate,
      },
      depreciationResults,
      chartData,
    });
  } catch (error) {
    console.error('Error calculating depreciation:', error);
    return NextResponse.json(
      { error: 'Failed to calculate depreciation' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get session for authentication
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get URL to parse query parameters
    const url = new URL(request.url);

    // Check if the asset exists
    const asset = await prisma.asset.findUnique({
      where: {
        id: params.id,
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Get the parameters from the query string
    const usefulLifeYears = url.searchParams.get('usefulLife');
    const salvageValue = url.searchParams.get('salvageValue');
    const method = url.searchParams.get('method');
    const depreciationRate = url.searchParams.get('depreciationRate');
    const depreciableCost = url.searchParams.get('depreciableCost');
    const dateAcquired = url.searchParams.get('dateAcquired');

    // Update the asset with the new depreciation settings
    const updatedAsset = await prisma.asset.update({
      where: {
        id: params.id,
      },
      data: {
        depreciableCost: depreciableCost ? parseFloat(depreciableCost) : null,
        salvageValue: salvageValue ? parseFloat(salvageValue) : null,
        usefulLifeMonths: usefulLifeYears ? parseInt(usefulLifeYears) * 12 : null,
        depreciationMethod: method || null,
        depreciationStartDate: dateAcquired ? new Date(dateAcquired) : null,
      },
    });

    // Calculate depreciation with the updated settings
    const depreciationResults = calculateDepreciation({
      purchasePrice: updatedAsset.depreciableCost || updatedAsset.purchasePrice,
      purchaseDate: (updatedAsset.depreciationStartDate || updatedAsset.purchaseDate).toISOString(),
      usefulLife: usefulLifeYears ? parseInt(usefulLifeYears) : Math.ceil((updatedAsset.usefulLifeMonths || 60) / 12),
      salvageValue: updatedAsset.salvageValue || updatedAsset.purchasePrice * 0.1,
      method: updatedAsset.depreciationMethod === 'STRAIGHT_LINE' ? 'STRAIGHT_LINE' : 'DECLINING_BALANCE',
      depreciationRate: depreciationRate ? parseInt(depreciationRate) : (updatedAsset.depreciationMethod === 'DOUBLE_DECLINING' ? 40 : 20),
    });

    // Generate chart data
    const chartData = generateChartData(depreciationResults);

    // Track the change in asset history
    try {
      const changes = [
        {
          assetId: params.id,
          field: 'depreciableCost',
          oldValue: asset.depreciableCost?.toString() || null,
          newValue: updatedAsset.depreciableCost?.toString() || null,
          changedBy: session.user?.name || 'system',
        },
        {
          assetId: params.id,
          field: 'salvageValue',
          oldValue: asset.salvageValue?.toString() || null,
          newValue: updatedAsset.salvageValue?.toString() || null,
          changedBy: session.user?.name || 'system',
        },
        {
          assetId: params.id,
          field: 'usefulLifeMonths',
          oldValue: asset.usefulLifeMonths?.toString() || null,
          newValue: updatedAsset.usefulLifeMonths?.toString() || null,
          changedBy: session.user?.name || 'system',
        },
        {
          assetId: params.id,
          field: 'depreciationMethod',
          oldValue: asset.depreciationMethod || null,
          newValue: updatedAsset.depreciationMethod || null,
          changedBy: session.user?.name || 'system',
        },
        {
          assetId: params.id,
          field: 'depreciationStartDate',
          oldValue: asset.depreciationStartDate?.toISOString() || null,
          newValue: updatedAsset.depreciationStartDate?.toISOString() || null,
          changedBy: session.user?.name || 'system',
        },
      ].filter(change => change.oldValue !== change.newValue);

      if (changes.length > 0) {
        await prisma.assetHistory.createMany({
          data: changes,
        });
      }
    } catch (error) {
      console.error('Error creating history records:', error);
      // Continue even if history recording fails
    }

    // Return the updated depreciation data
    return NextResponse.json({
      asset: {
        id: updatedAsset.id,
        name: updatedAsset.name,
        purchaseDate: updatedAsset.purchaseDate,
        purchasePrice: updatedAsset.purchasePrice,
        currentValue: updatedAsset.currentValue,
      },
      depreciationSettings: {
        depreciableCost: updatedAsset.depreciableCost || updatedAsset.purchasePrice,
        salvageValue: updatedAsset.salvageValue || updatedAsset.purchasePrice * 0.1,
        usefulLifeYears: Math.ceil((updatedAsset.usefulLifeMonths || 60) / 12),
        usefulLifeMonths: updatedAsset.usefulLifeMonths || 60,
        depreciationMethod: updatedAsset.depreciationMethod || 'STRAIGHT_LINE',
        depreciationRate: depreciationRate ? parseInt(depreciationRate) : (updatedAsset.depreciationMethod === 'DOUBLE_DECLINING' ? 40 : 20),
        startDate: updatedAsset.depreciationStartDate || updatedAsset.purchaseDate,
      },
      depreciationResults,
      chartData,
    });
  } catch (error) {
    console.error('Error updating depreciation settings:', error);
    return NextResponse.json(
      { error: 'Failed to update depreciation settings', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
