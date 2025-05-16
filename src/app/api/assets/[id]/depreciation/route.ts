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

    // Fetch the asset with its depreciation settings and capital improvements
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
        capitalImprovements: {
          select: {
            id: true,
            description: true,
            improvementDate: true,
            cost: true,
          },
          orderBy: {
            improvementDate: 'asc',
          },
        },
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
      : (asset.salvageValue || 0); // Use 0 as default if not set

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

    // Get total units and units per year for Units of Activity method
    const totalUnits = url.searchParams.get('totalUnits')
      ? parseInt(url.searchParams.get('totalUnits')!)
      : 10000; // Default value

    const unitsPerYearParam = url.searchParams.get('unitsPerYear');
    const unitsPerYear = unitsPerYearParam
      ? JSON.parse(unitsPerYearParam)
      : Array(usefulLifeYears).fill(totalUnits / usefulLifeYears); // Default to even distribution

    // Map the depreciation method from the database to the utility function
    let calculationMethod: 'STRAIGHT_LINE' | 'DECLINING_BALANCE' | 'SUM_OF_YEARS_DIGITS' | 'UNITS_OF_ACTIVITY';

    // Use the query method if provided, otherwise use the stored method
    const methodToUse = queryMethod || depreciationMethod;

    switch(methodToUse) {
      case 'STRAIGHT_LINE':
        calculationMethod = 'STRAIGHT_LINE';
        break;
      case 'DECLINING_BALANCE':
      case 'DOUBLE_DECLINING':
        calculationMethod = 'DECLINING_BALANCE';
        break;
      case 'SUM_OF_YEARS_DIGITS':
        calculationMethod = 'SUM_OF_YEARS_DIGITS';
        break;
      case 'UNITS_OF_ACTIVITY':
        calculationMethod = 'UNITS_OF_ACTIVITY';
        break;
      default:
        calculationMethod = 'STRAIGHT_LINE'; // Default
    }

    // Calculate depreciation using the depreciableCost field
    // This already includes any capital improvements that have been added
    const depreciationResults = calculateDepreciation({
      purchasePrice: depreciableCost,
      purchaseDate: startDate.toISOString(),
      usefulLife: usefulLifeYears,
      salvageValue: salvageValue,
      method: calculationMethod,
      depreciationRate: depreciationRate,
      totalUnits: totalUnits,
      unitsPerYear: unitsPerYear
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
        // Use the query method if provided, otherwise use the stored method
        depreciationMethod: queryMethod || depreciationMethod,
        depreciationRate,
        startDate,
        totalUnits,
        unitsPerYear,
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

    // Check if the asset exists and get its capital improvements
    const asset = await prisma.asset.findUnique({
      where: {
        id: params.id,
      },
      include: {
        capitalImprovements: {
          select: {
            id: true,
            description: true,
            improvementDate: true,
            cost: true,
          },
          orderBy: {
            improvementDate: 'asc',
          },
        },
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

    // Map the method to handle special cases like DOUBLE_DECLINING
    let depreciationMethodValue = null;
    if (method) {
      // Handle special case for DOUBLE_DECLINING which isn't in the enum
      if (method === 'DOUBLE_DECLINING') {
        depreciationMethodValue = 'DECLINING_BALANCE';
      } else {
        // Use the method directly for all other cases
        depreciationMethodValue = method;
      }
    }

    // Store the original method for our calculations
    const originalMethod = method;

    // Update the asset with the new depreciation settings
    const updatedAsset = await prisma.asset.update({
      where: {
        id: params.id,
      },
      data: {
        depreciableCost: depreciableCost ? parseFloat(depreciableCost) : null,
        salvageValue: salvageValue ? parseFloat(salvageValue) : null,
        usefulLifeMonths: usefulLifeYears ? parseInt(usefulLifeYears) * 12 : null,
        depreciationMethod: depreciationMethodValue,
        depreciationStartDate: dateAcquired ? new Date(dateAcquired) : null,
      },
    });

    // Get total units and units per year for Units of Activity method
    const totalUnits = url.searchParams.get('totalUnits')
      ? parseInt(url.searchParams.get('totalUnits')!)
      : 10000; // Default value

    const unitsPerYearParam = url.searchParams.get('unitsPerYear');
    const unitsPerYear = unitsPerYearParam
      ? JSON.parse(unitsPerYearParam)
      : Array(parseInt(usefulLifeYears || '5')).fill(totalUnits / parseInt(usefulLifeYears || '5')); // Default to even distribution

    // Use the original method for calculation
    let calculationMethod: 'STRAIGHT_LINE' | 'DECLINING_BALANCE' | 'SUM_OF_YEARS_DIGITS' | 'UNITS_OF_ACTIVITY';

    switch(originalMethod) {
      case 'STRAIGHT_LINE':
        calculationMethod = 'STRAIGHT_LINE';
        break;
      case 'DECLINING_BALANCE':
      case 'DOUBLE_DECLINING':
        calculationMethod = 'DECLINING_BALANCE';
        break;
      case 'SUM_OF_YEARS_DIGITS':
        calculationMethod = 'SUM_OF_YEARS_DIGITS';
        break;
      case 'UNITS_OF_ACTIVITY':
        calculationMethod = 'UNITS_OF_ACTIVITY';
        break;
      default:
        calculationMethod = 'STRAIGHT_LINE'; // Default
    }

    // Calculate depreciation using the depreciableCost field
    // This already includes any capital improvements that have been added
    const usefulLifeValue = usefulLifeYears ? parseInt(usefulLifeYears) : Math.ceil((updatedAsset.usefulLifeMonths || 60) / 12);
    const startDateValue = (updatedAsset.depreciationStartDate || updatedAsset.purchaseDate);

    const depreciationResults = calculateDepreciation({
      purchasePrice: updatedAsset.depreciableCost || updatedAsset.purchasePrice,
      purchaseDate: startDateValue.toISOString(),
      usefulLife: usefulLifeValue,
      salvageValue: updatedAsset.salvageValue || 0,
      method: calculationMethod,
      depreciationRate: depreciationRate ? parseInt(depreciationRate) : (originalMethod === 'DOUBLE_DECLINING' ? 40 : 20),
      totalUnits: totalUnits,
      unitsPerYear: unitsPerYear
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
        salvageValue: updatedAsset.salvageValue || 0,
        usefulLifeYears: Math.ceil((updatedAsset.usefulLifeMonths || 60) / 12),
        usefulLifeMonths: updatedAsset.usefulLifeMonths || 60,
        // Use the original method from the request, not the one stored in the database
        depreciationMethod: originalMethod || 'STRAIGHT_LINE',
        depreciationRate: depreciationRate ? parseInt(depreciationRate) : (originalMethod === 'DOUBLE_DECLINING' ? 40 : 20),
        startDate: updatedAsset.depreciationStartDate || updatedAsset.purchaseDate,
        totalUnits,
        unitsPerYear,
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
