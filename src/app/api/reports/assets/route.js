//import { Response } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateDepreciation, calculateMonthlyDepreciation } from '@/utils/depreciation';

// GET /api/reports/assets
import { withRole } from '@/middleware/rbac';

export const GET = withRole([ 'MANAGER', 'USER','AUDITOR'], async function GET(req) {
  try {
    const url = new URL(req.url);
    const now = new Date();
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    // Parse query parameters for advanced filtering
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const category = url.searchParams.get('category');
    const currentDepartment = url.searchParams.get('currentDepartment'); // Fixed parameter name
    const location = url.searchParams.get('location');
    const status = url.searchParams.get('status');
    const minValue = url.searchParams.get('minValue');
    const maxValue = url.searchParams.get('maxValue');
    const depreciationMethod = url.searchParams.get('depreciationMethod');
    const year = url.searchParams.get('year') ? parseInt(url.searchParams.get('year')) : null;
    const month = url.searchParams.get('month') ? parseInt(url.searchParams.get('month')) : null;

    // Parse pagination parameters
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 25;
    const offset = (page - 1) * limit;

    // Debug logging
    console.log('🔍 API Debug: Received query parameters:', {
      startDate, endDate, category, currentDepartment, location, status, minValue, maxValue, depreciationMethod, year, month, page, limit, offset
    });

    // Build where clause for filtering
    const whereClause = {};

    if (startDate && endDate) {
      // Ensure end date includes the full day
      const startDateTime = new Date(startDate);
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999); // Set to end of day

      whereClause.sivDate = {
        gte: startDateTime,
        lte: endDateTime
      };
      console.log('🔍 API Debug: Date filter applied:', {
        startDate: startDateTime.toISOString(),
        endDate: endDateTime.toISOString()
      });
    } else if (startDate) {
      // Only start date provided
      whereClause.sivDate = {
        gte: new Date(startDate)
      };
      console.log('🔍 API Debug: Start date filter applied:', new Date(startDate).toISOString());
    } else if (endDate) {
      // Only end date provided
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      whereClause.sivDate = {
        lte: endDateTime
      };
      console.log('🔍 API Debug: End date filter applied:', endDateTime.toISOString());
    }

    if (category && category !== 'all') {
      whereClause.category = category;
    }

    if (currentDepartment && currentDepartment !== 'all') {
      whereClause.currentDepartment = currentDepartment;
    }

    if (location && location !== 'all') {
      whereClause.location = location;
    }

    if (status && status !== 'all') {
      whereClause.status = status;
    }

    if (minValue || maxValue) {
      whereClause.currentValue = {};

      if (minValue) {
        const minVal = parseFloat(minValue);
        if (!isNaN(minVal) && minVal >= 0) {
          whereClause.currentValue.gte = minVal;
          console.log('🔍 API Debug: Min value filter applied:', minVal);
        }
      }

      if (maxValue) {
        const maxVal = parseFloat(maxValue);
        if (!isNaN(maxVal) && maxVal >= 0) {
          whereClause.currentValue.lte = maxVal;
          console.log('🔍 API Debug: Max value filter applied:', maxVal);
        }
      }

      // If no valid values were set, remove the currentValue filter
      if (Object.keys(whereClause.currentValue).length === 0) {
        delete whereClause.currentValue;
      }
    }

    if (depreciationMethod && depreciationMethod !== 'all') {
      whereClause.depreciationMethod = depreciationMethod;
    }

    // Debug: Log the where clause
    console.log('🔍 API Debug: Where clause built:', JSON.stringify(whereClause, null, 2));

    // Additional debugging for each filter
    console.log('🔍 API Debug: Filter analysis:');
    console.log('  - Date range:', startDate && endDate ? `${startDate} to ${endDate}` : 'Not applied');
    console.log('  - Category:', category !== 'all' ? category : 'All categories');
    console.log('  - Department:', currentDepartment !== 'all' ? currentDepartment : 'All departments');
    console.log('  - Location:', location !== 'all' ? location : 'All locations');
    console.log('  - Status:', status !== 'all' ? status : 'All statuses');
    console.log('  - Value range:', (minValue || maxValue) ? `${minValue || '0'} to ${maxValue || '∞'}` : 'Not applied');
    console.log('  - Depreciation method:', depreciationMethod !== 'all' ? depreciationMethod : 'All methods');

    // Get total and active asset counts with filters
    const totalAssets = await prisma.asset.count({ where: whereClause });
    const activeAssets = await prisma.asset.count({
      where: { ...whereClause, status: 'ACTIVE' }
    });

    console.log('🔍 API Debug: Asset counts - Total:', totalAssets, 'Active:', activeAssets);

    // Assets by category with filters
    const assetsByCategory = await prisma.asset.groupBy({
      by: ['category', 'status'],
      where: whereClause,
      _count: { id: true },
      _sum: { currentValue: true }
    });

    // Assets by department with filters
    const assetsByDepartment = await prisma.asset.groupBy({
      by: ['currentDepartment', 'status'],
      where: whereClause,
      _count: { id: true },
      _sum: { currentValue: true }
    });

    // Asset status distribution with filters
    const statusDistribution = await prisma.asset.groupBy({
      by: ['status'],
      where: whereClause,
      _count: { id: true }
    });

    // Get total count for pagination
    const totalAssetsCount = await prisma.asset.count({
      where: whereClause
    });

    // Enhanced depreciation data calculation and detailed asset list with pagination
    const assets = await prisma.asset.findMany({
      where: whereClause,
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
        type: true,
        supplier: true,
        warrantyExpiry: true,
        depreciableCost: true,
        salvageValue: true,
        depreciationMethod: true,
        depreciationStartDate: true,
        createdAt: true,
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ],
      skip: offset,
      take: limit
    });

    // Fetch book values for all assets for the selected year/month
    let bookValueMap = {};
    let bookValueByDepartment = [];
    let bookValueByCategory = [];
    let bookValuesByAsset = {};
    if (year && month) {
      const assetIds = assets.map(a => a.id);
      const bookValues = await prisma.depreciationSchedule.findMany({
        where: {
          assetId: { in: assetIds },
          year,
          month,
        },
        select: { assetId: true, bookValue: true }
      });
      bookValueMap = Object.fromEntries(bookValues.map(bv => [bv.assetId, bv.bookValue]));

      // Aggregate book value by department
      const assetIdToDepartment = Object.fromEntries(assets.map(a => [a.id, a.currentDepartment || 'Unassigned']));
      const departmentTotals = {};
      for (const bv of bookValues) {
        const dept = assetIdToDepartment[bv.assetId] || 'Unassigned';
        departmentTotals[dept] = (departmentTotals[dept] || 0) + (bv.bookValue || 0);
      }
      bookValueByDepartment = Object.entries(departmentTotals).map(([department, totalBookValue]) => ({ department, totalBookValue }));

      // Aggregate book value by category
      const assetIdToCategory = Object.fromEntries(assets.map(a => [a.id, a.category || 'Uncategorized']));
      const categoryTotals = {};
      for (const bv of bookValues) {
        const cat = assetIdToCategory[bv.assetId] || 'Uncategorized';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + (bv.bookValue || 0);
      }
      bookValueByCategory = Object.entries(categoryTotals).map(([category, totalBookValue]) => ({ category, totalBookValue }));
    } else if (year && !month) {
      // Fetch all months for the selected year
      const assetIds = assets.map(a => a.id);
      const allBookValues = await prisma.depreciationSchedule.findMany({
        where: {
          assetId: { in: assetIds },
          year,
        },
        select: { assetId: true, month: true, bookValue: true }
      });

      // Build a map: { assetId: { 1: value, 2: value, ..., 12: value } }
      bookValuesByAsset = {};
      allBookValues.forEach(({ assetId, month, bookValue }) => {
        if (!bookValuesByAsset[assetId]) bookValuesByAsset[assetId] = {};
        bookValuesByAsset[assetId][month] = bookValue;
      });

      console.log('🔍 API Debug: Found book values from database for', allBookValues.length, 'asset-month combinations');

      // For assets that don't have book values in the database, calculate them dynamically
      for (const asset of assets) {
        if (!bookValuesByAsset[asset.id] || Object.keys(bookValuesByAsset[asset.id]).length === 0) {
          console.log('🔍 API Debug: Calculating monthly book values for asset', asset.id, asset.name);

          try {
            const depreciableCost = asset.depreciableCost || asset.unitPrice;
            const salvageValue = asset.salvageValue || 0;
            const usefulLifeYears = asset.usefulLifeYears || 5;
            const method = asset.depreciationMethod || 'STRAIGHT_LINE';
            const startDate = asset.depreciationStartDate || asset.sivDate;

            if (depreciableCost && depreciableCost > 0 && startDate) {
              const monthlyResults = calculateMonthlyDepreciation({
                unitPrice: depreciableCost,
                sivDate: startDate.toISOString(),
                usefulLifeYears: usefulLifeYears,
                salvageValue: salvageValue,
                method: method,
              });

              // Filter results for the selected year and build the monthly map
              const yearResults = monthlyResults.filter(result => result.year === year);
              if (yearResults.length > 0) {
                bookValuesByAsset[asset.id] = {};
                yearResults.forEach(result => {
                  bookValuesByAsset[asset.id][result.month] = result.bookValue;
                });
                console.log('🔍 API Debug: Calculated', yearResults.length, 'monthly values for asset', asset.id);
              }
            }
          } catch (error) {
            console.error('🔍 API Debug: Error calculating monthly depreciation for asset', asset.id, ':', error.message);
          }
        }
      }
    }

    // Calculate actual depreciation data for each asset
    const monthlyDepreciation = new Map();

    for (const asset of assets) {
      try {
        const depreciableCost = asset.depreciableCost || asset.unitPrice;
        const salvageValue = asset.salvageValue || 0;
        const usefulLifeYears = asset.usefulLifeYears || 5;
        const method = asset.depreciationMethod || 'STRAIGHT_LINE';
        const startDate = asset.depreciationStartDate || asset.sivDate;

        // Skip assets with invalid or zero unit price
        if (!depreciableCost || depreciableCost <= 0) {
          console.warn(`Skipping depreciation calculation for asset ${asset.id} (${asset.name}): Invalid unit price (${depreciableCost})`);
          continue;
        }

        // Skip assets without valid start date
        if (!startDate) {
          console.warn(`Skipping depreciation calculation for asset ${asset.id} (${asset.name}): No valid start date`);
          continue;
        }

        // Additional validation
        if (salvageValue < 0 || salvageValue >= depreciableCost) {
          console.warn(`Skipping depreciation calculation for asset ${asset.id} (${asset.name}): Invalid salvage value (${salvageValue}) vs unit price (${depreciableCost})`);
          continue;
        }

        const depreciationResults = calculateDepreciation({
          unitPrice: depreciableCost,
          sivDate: startDate.toISOString(),
          usefulLifeYears: usefulLifeYears,
          salvageValue: salvageValue,
          method: method,
        });

        // Group by month for the last 12 months
        depreciationResults.forEach(result => {
          const resultDate = new Date(result.year, 0, 1); // January 1st of the year
          if (resultDate >= twelveMonthsAgo && resultDate <= now) {
            const monthKey = `${resultDate.getFullYear()}-${String(resultDate.getMonth() + 1).padStart(2, '0')}`;

            if (!monthlyDepreciation.has(monthKey)) {
              monthlyDepreciation.set(monthKey, {
                month: monthKey,
                totalValue: 0,
                totalDepreciation: 0,
                assetCount: 0
              });
            }

            const monthData = monthlyDepreciation.get(monthKey);
            monthData.totalValue += result.bookValue;
            monthData.totalDepreciation += result.depreciationExpense;
            monthData.assetCount += 1;
          }
        });
      } catch (e) {
        console.error(`Error calculating depreciation for asset ${asset.id} (${asset.name || 'Unknown'}):`, {
          error: e.message,
          unitPrice: asset.unitPrice,
          depreciableCost: asset.depreciableCost || asset.unitPrice,
          salvageValue: asset.salvageValue || 0,
          usefulLifeYears: asset.usefulLifeYears || 5,
          startDate: asset.depreciationStartDate || asset.sivDate
        });
        // Continue processing other assets instead of crashing
        continue;
      }
    }

    // Convert map to array and sort by month
    const sortedDepreciationData = Array.from(monthlyDepreciation.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(item => ({
        month: item.month,
        value: item.totalValue,
        depreciation: item.totalDepreciation
      }));

    // Total current value with filters
    const totalValue = await prisma.asset.aggregate({
      where: whereClause,
      _sum: { currentValue: true }
    });

    // Total purchase value with filters (using unitPrice instead of purchasePrice)
    const totalPurchaseValue = await prisma.asset.aggregate({
      where: whereClause,
      _sum: { unitPrice: true }
    });

    // Total maintenance cost with filters (skip if maintenance table doesn't exist)
    let maintenanceCost = { _sum: { cost: 0 } };
    try {
      maintenanceCost = await prisma.maintenance.aggregate({
        where: {
          asset: whereClause
        },
        _sum: { cost: true }
      });
    } catch (error) {
      console.log('🔍 API Debug: Maintenance table not available, skipping maintenance cost calculation');
      maintenanceCost = { _sum: { cost: 0 } };
    }

    // Asset count 12 months ago (for growth calculation)
    const pastAssets = await prisma.asset.count({
      where: {
        ...whereClause,
        createdAt: {
          lt: twelveMonthsAgo
        }
      }
    });

    // Value 12 months ago with filters
    const pastValueResult = await prisma.asset.aggregate({
      where: {
        ...whereClause,
        createdAt: {
          lt: twelveMonthsAgo
        }
      },
      _sum: {
        currentValue: true
      }
    });

    const assetGrowth = totalAssets - pastAssets;
    const valueGrowth = (totalValue._sum.currentValue ?? 0) - (pastValueResult._sum.currentValue ?? 0);

    // Calculate total depreciation from our enhanced data
    const totalDepreciation = sortedDepreciationData.reduce((acc, item) => {
      return acc + item.depreciation;
    }, 0);

    // Advanced analytics calculations
    let averageAssetAge = [{ avg_age: 0 }];
    try {
      if (Object.keys(whereClause).length === 0) {
        averageAssetAge = await prisma.$queryRaw`
          SELECT AVG(EXTRACT(YEAR FROM AGE(NOW(), "sivDate"))) as avg_age
          FROM "Asset"
          WHERE "sivDate" IS NOT NULL
        `;
      } else {
        // For filtered queries, calculate age manually
        const assetsForAge = await prisma.asset.findMany({
          where: whereClause,
          select: { sivDate: true }
        });

        if (assetsForAge.length > 0) {
          const totalAge = assetsForAge.reduce((sum, asset) => {
            if (asset.sivDate) {
              const ageInYears = (now.getTime() - asset.sivDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
              return sum + ageInYears;
            }
            return sum;
          }, 0);
          averageAssetAge = [{ avg_age: totalAge / assetsForAge.length }];
        }
      }
    } catch (error) {
      console.error('Error calculating average asset age:', error);
      averageAssetAge = [{ avg_age: 0 }];
    }

    // Asset utilization rate
    const utilizationRate = totalAssets > 0 ? (activeAssets / totalAssets) * 100 : 0;

    // ROI calculation (simplified)
    const totalROI = totalPurchaseValue._sum.unitPrice > 0
      ? ((totalValue._sum.currentValue - (maintenanceCost._sum.cost || 0)) / totalPurchaseValue._sum.unitPrice) * 100
      : 0;

    // Get unique filter options for frontend (get all unique values, not just from filtered results)
    console.log('🔍 API Debug: Fetching filter options...');

    // Get all unique categories
    const categoriesResult = await prisma.asset.findMany({
      select: { category: true },
      distinct: ['category'],
      where: { category: { not: null } }
    });

    // Get all unique departments
    const departmentsResult = await prisma.asset.findMany({
      select: { currentDepartment: true },
      distinct: ['currentDepartment'],
      where: { currentDepartment: { not: null } }
    });

    // Get all unique locations
    const locationsResult = await prisma.asset.findMany({
      select: { location: true },
      distinct: ['location'],
      where: { location: { not: null } }
    });

    // Get all unique depreciation methods
    const depreciationMethodsResult = await prisma.asset.findMany({
      select: { depreciationMethod: true },
      distinct: ['depreciationMethod'],
      where: { depreciationMethod: { not: null } }
    });

    const uniqueCategories = categoriesResult.map(item => item.category).filter(Boolean);
    const uniqueDepartments = departmentsResult.map(item => item.currentDepartment).filter(Boolean);
    const uniqueLocations = locationsResult.map(item => item.location).filter(Boolean);
    const uniqueDepreciationMethods = depreciationMethodsResult.map(item => item.depreciationMethod).filter(Boolean);

    console.log('🔍 API Debug: Filter options found:');
    console.log('  - Categories:', uniqueCategories);
    console.log('  - Departments:', uniqueDepartments);
    console.log('  - Locations:', uniqueLocations);
    console.log('  - Depreciation Methods:', uniqueDepreciationMethods);

    const formattedData = {
      stats: {
        totalAssets,
        activeAssets,
        totalValue: totalValue._sum.currentValue ?? 0,
        totalPurchaseValue: totalPurchaseValue._sum.unitPrice ?? 0,
        maintenanceCost: maintenanceCost._sum.cost ?? 0,
        assetGrowth,
        valueGrowth,
        totalDepreciation,
        averageAssetAge: averageAssetAge[0]?.avg_age ? parseFloat(averageAssetAge[0].avg_age) : 0,
        utilizationRate: parseFloat(utilizationRate.toFixed(2)),
        totalROI: parseFloat(totalROI.toFixed(2))
      },
      pagination: {
        page,
        limit,
        total: totalAssetsCount,
        totalPages: Math.ceil(totalAssetsCount / limit),
        hasNextPage: page < Math.ceil(totalAssetsCount / limit),
        hasPreviousPage: page > 1
      },
      byCategory: assetsByCategory.map(item => ({
        category: item.category || 'Uncategorized',
        status: item.status,
        count: item._count.id,
        value: item._sum.currentValue ?? 0
      })),
      byDepartment: assetsByDepartment.map(item => ({
        department: item.currentDepartment || 'Unassigned',
        status: item.status,
        count: item._count.id,
        value: item._sum.currentValue ?? 0
      })),
      statusDistribution: statusDistribution.map(item => ({
        status: item.status,
        count: item._count.id,
        percentage: totalAssets > 0 ? parseFloat(((item._count.id / totalAssets) * 100).toFixed(2)) : 0
      })),
      depreciation: sortedDepreciationData,
      assets: assets.map(asset => ({
        id: asset.id,
        name: asset.name,
        itemDescription: asset.itemDescription,
        serialNumber: asset.serialNumber,
        oldTagNumber: asset.oldTagNumber,
        newTagNumber: asset.newTagNumber,
        grnNumber: asset.grnNumber,
        grnDate: asset.grnDate ? asset.grnDate.toISOString().split('T')[0] : null,
        unitPrice: asset.unitPrice,
        sivNumber: asset.sivNumber,
        sivDate: asset.sivDate ? asset.sivDate.toISOString().split('T')[0] : null,
        currentDepartment: asset.currentDepartment,
        remark: asset.remark,
        usefulLifeYears: asset.usefulLifeYears,
        residualPercentage: asset.residualPercentage,
        category: asset.category,
        status: asset.status,
        location: asset.location,
        currentValue: asset.currentValue,
        depreciationMethod: asset.depreciationMethod,
        supplier: asset.supplier,
        warrantyExpiry: asset.warrantyExpiry ? asset.warrantyExpiry.toISOString().split('T')[0] : null,
        age: asset.sivDate ? Math.floor((now - asset.sivDate) / (1000 * 60 * 60 * 24 * 365.25)) : 0,
        depreciationRate: asset.unitPrice > 0 ?
          ((asset.unitPrice - asset.currentValue) / asset.unitPrice * 100).toFixed(1) : 0,
        ...(year && month ? { bookValue: bookValueMap[asset.id] ?? null } : {}),
        ...(year && !month ? {
          bookValuesByMonth: bookValuesByAsset[asset.id] || {},
          // Add debug info for the first few assets
          ...(assets.indexOf(asset) < 3 ? {
            _debug_bookValuesByMonth: bookValuesByAsset[asset.id] || {},
            _debug_hasBookValues: !!(bookValuesByAsset[asset.id] && Object.keys(bookValuesByAsset[asset.id]).length > 0)
          } : {})
        } : {}),
      })),
      filterOptions: {
        categories: uniqueCategories,
        departments: uniqueDepartments,
        locations: uniqueLocations,
        depreciationMethods: uniqueDepreciationMethods
      },
      analytics: {
        depreciationTrend: sortedDepreciationData.length > 1 ?
          sortedDepreciationData[sortedDepreciationData.length - 1].depreciation - sortedDepreciationData[0].depreciation : 0,
        averageDepreciationRate: totalPurchaseValue._sum.unitPrice > 0 ?
          (totalDepreciation / totalPurchaseValue._sum.unitPrice) * 100 : 0,
        assetTurnover: totalPurchaseValue._sum.unitPrice > 0 ?
          (totalValue._sum.currentValue / totalPurchaseValue._sum.unitPrice) : 0
      },
      bookValueByDepartment,
      bookValueByCategory,
    };

    return Response.json(formattedData);
  } catch (error) {
    console.error('Error fetching asset reports:', error);
    return Response.json(
      { error: 'Failed to fetch asset reports' },
      { status: 500 }
    );
  }
});