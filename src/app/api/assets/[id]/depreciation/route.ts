import { prisma } from '@/lib/prisma';
import { calculateDepreciation, generateChartData, calculateMonthlyDepreciation } from '@/utils/depreciation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);

    const asset = await prisma.asset.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        itemDescription: true,
        serialNumber: true,
        oldTagNumber: true,
        newTagNumber: true,
        grnNumber: true,
        grnDate: true,
        unitPrice: true,
        sivNumber: true,
        sivDate: true,
        currentDepartment: true,
        remark: true,
        usefulLifeYears: true,
        residualPercentage: true,
        currentValue: true,
        status: true,
        location: true,
        category: true,
        supplier: true,
        warrantyExpiry: true,
        lastMaintenance: true,
        nextMaintenance: true,
        salvageValue: true,
        depreciationMethod: true,
        depreciationStartDate: true,
        createdAt: true,
        updatedAt: true,
        capitalImprovements: {
          select: {
            id: true,
            description: true,
            improvementDate: true,
            cost: true,
          },
          orderBy: { improvementDate: 'asc' },
        },
      },
    });

    if (!asset) {
      return Response.json({ error: 'Asset not found' }, { status: 404 });
    }

    const queryUsefulLife = url.searchParams.get('usefulLife');
    const querySalvageValue = url.searchParams.get('salvageValue');
    const queryMethod = url.searchParams.get('method');
    const queryDepreciationRate = url.searchParams.get('depreciationRate');

    const depreciableCost = asset.unitPrice || asset.currentValue;
    const salvageValue = querySalvageValue ? parseFloat(querySalvageValue) : (asset.salvageValue || 0);
    const usefulLifeYears = queryUsefulLife ? parseInt(queryUsefulLife) : (asset.usefulLifeYears || 5);
    const depreciationMethod = (queryMethod || asset.depreciationMethod || 'STRAIGHT_LINE') as 'STRAIGHT_LINE' | 'DECLINING_BALANCE' | 'DOUBLE_DECLINING' | 'SUM_OF_YEARS_DIGITS' | 'UNITS_OF_ACTIVITY';
    const depreciationRate = queryDepreciationRate ? parseFloat(queryDepreciationRate) : undefined;

    // Use sivDate as the start date for depreciation, fallback to createdAt if missing
    const startDate = asset.sivDate ? asset.sivDate : asset.createdAt;
    const depreciationResults = calculateDepreciation({
      unitPrice: depreciableCost,
      sivDate: startDate.toISOString ? startDate.toISOString() : startDate,
      usefulLifeYears: usefulLifeYears,
      salvageValue: salvageValue,
      method: depreciationMethod,
      depreciationRate: depreciationRate,
      // totalUnits and unitsPerYear can be added here if needed for Units of Activity
    });
    const monthlyDepreciationResults = calculateMonthlyDepreciation({
      unitPrice: depreciableCost,
      sivDate: startDate.toISOString ? startDate.toISOString() : startDate,
      usefulLifeYears: usefulLifeYears,
      salvageValue: salvageValue,
      method: depreciationMethod,
      depreciationRate: depreciationRate,
      // totalUnits and unitsPerYear can be added here if needed for Units of Activity
    });
    const chartData = generateChartData(depreciationResults);
    return Response.json({
      asset,
      depreciationSettings: {
        depreciableCost,
        salvageValue,
        usefulLifeYears,
        depreciationMethod,
        depreciationRate,
        startDate: startDate,
      },
      depreciationResults,
      monthlyDepreciationResults,
      chartData,
    });
  } catch (error) {
    console.error('Error fetching depreciation data:', error);
    return Response.json(
      { error: 'Failed to fetch depreciation data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}



export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Get session for authentication
    const session = await getServerSession(authOptions);

    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get URL to parse query parameters
    const url = new URL(request.url);

    // Check if the asset exists and get its capital improvements
    const asset = await prisma.asset.findUnique({
      where: {
        id,
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
      return Response.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Get the parameters from the query string
    const usefulLifeYears = url.searchParams.get('usefulLife');
    const salvageValue = url.searchParams.get('salvageValue');
    const method = url.searchParams.get('method');
    const depreciationRate = url.searchParams.get('depreciationRate');
    const depreciableCost = url.searchParams.get('depreciableCost');
    const dateAcquired = url.searchParams.get('dateAcquired');
    const calculateAsGroup = url.searchParams.get('calculateAsGroup') === 'true';

    console.log("API PUT: Updating depreciation settings with calculateAsGroup =", calculateAsGroup);
    console.log("API PUT: Query parameter value:", url.searchParams.get('calculateAsGroup'));

    // Map the method to handle special cases like DOUBLE_DECLINING
    let depreciationMethodValue: 'STRAIGHT_LINE' | 'DECLINING_BALANCE' | 'DOUBLE_DECLINING' | 'SUM_OF_YEARS_DIGITS' | 'UNITS_OF_ACTIVITY' | null = null;
    let effectivePutDepreciationRate = depreciationRate ? parseInt(depreciationRate) : 20;
    if (method) {
      if (method === 'DOUBLE_DECLINING') {
        depreciationMethodValue = 'DOUBLE_DECLINING'; // Store as DOUBLE_DECLINING
        effectivePutDepreciationRate = 40; // Always use 40% for double declining
      } else {
        depreciationMethodValue = method as 'STRAIGHT_LINE' | 'DECLINING_BALANCE' | 'DOUBLE_DECLINING' | 'SUM_OF_YEARS_DIGITS' | 'UNITS_OF_ACTIVITY';
      }
    }

    // Store the original method for our calculations
    const originalMethod = method;

    // Update the asset with the new depreciation settings
    const updatedAsset = await prisma.asset.update({
      where: {
        id,
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
    let calculationMethodPut: 'STRAIGHT_LINE' | 'DECLINING_BALANCE' | 'DOUBLE_DECLINING' | 'SUM_OF_YEARS_DIGITS' | 'UNITS_OF_ACTIVITY';
    switch(originalMethod) {
      case 'STRAIGHT_LINE':
        calculationMethodPut = 'STRAIGHT_LINE';
        break;
      case 'DECLINING_BALANCE':
        calculationMethodPut = 'DECLINING_BALANCE';
        break;
      case 'DOUBLE_DECLINING':
        calculationMethodPut = 'DOUBLE_DECLINING';
        effectivePutDepreciationRate = 40;
        break;
      case 'SUM_OF_YEARS_DIGITS':
        calculationMethodPut = 'SUM_OF_YEARS_DIGITS';
        break;
      case 'UNITS_OF_ACTIVITY':
        calculationMethodPut = 'UNITS_OF_ACTIVITY';
        break;
      default:
        calculationMethodPut = 'STRAIGHT_LINE';
    }

    // Calculate depreciation using the depreciableCost field
    // This already includes any capital improvements that have been added
    const usefulLifeValue = usefulLifeYears ? parseInt(usefulLifeYears) : Math.ceil((updatedAsset.usefulLifeMonths || 60) / 12);
    const startDateValue = (updatedAsset.depreciationStartDate || updatedAsset.purchaseDate);

    const depreciationResults = calculateDepreciation({
      unitPrice: updatedAsset.depreciableCost || updatedAsset.purchasePrice,
      sivDate: startDateValue.toISOString(),
      usefulLifeYears: usefulLifeValue,
      salvageValue: updatedAsset.salvageValue || 0,
      method: calculationMethodPut,
      depreciationRate: effectivePutDepreciationRate,
      totalUnits: totalUnits,
      unitsPerYear: unitsPerYear
    });

    // Generate chart data
    const chartData = generateChartData(depreciationResults);

    // Track the change in asset history
    try {
      const changes = [
        {
          assetId: id,
          field: 'depreciableCost',
          oldValue: asset.depreciableCost?.toString() || null,
          newValue: updatedAsset.depreciableCost?.toString() || null,
          changedBy: session.user?.name || 'system',
        },
        {
          assetId: id,
          field: 'salvageValue',
          oldValue: asset.salvageValue?.toString() || null,
          newValue: updatedAsset.salvageValue?.toString() || null,
          changedBy: session.user?.name || 'system',
        },
        {
          assetId: id,
          field: 'usefulLifeMonths',
          oldValue: asset.usefulLifeMonths?.toString() || null,
          newValue: updatedAsset.usefulLifeMonths?.toString() || null,
          changedBy: session.user?.name || 'system',
        },
        {
          assetId: id,
          field: 'depreciationMethod',
          oldValue: asset.depreciationMethod || null,
          newValue: updatedAsset.depreciationMethod || null,
          changedBy: session.user?.name || 'system',
        },
        {
          assetId: id,
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
    return Response.json({
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
    return Response.json(
      { error: 'Failed to update depreciation settings', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
