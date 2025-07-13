//import { Response } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateDepreciation } from '@/utils/depreciation';

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
    const department = url.searchParams.get('department');
    const location = url.searchParams.get('location');
    const status = url.searchParams.get('status');
    const minValue = url.searchParams.get('minValue');
    const maxValue = url.searchParams.get('maxValue');
    const depreciationMethod = url.searchParams.get('depreciationMethod');
    const year = url.searchParams.get('year') ? parseInt(url.searchParams.get('year')) : null;
    const month = url.searchParams.get('month') ? parseInt(url.searchParams.get('month')) : null;

    // Debug logging
    console.log('🔍 API Debug: Received query parameters:', {
      startDate, endDate, category, department, location, status, minValue, maxValue, depreciationMethod, year, month
    });

    // Build where clause for filtering
    const whereClause = {};

    if (startDate && endDate) {
      whereClause.sivDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    if (category && category !== 'all') {
      whereClause.category = category;
    }

    if (department && department !== 'all') {
      whereClause.currentDepartment = department;
    }

    if (location && location !== 'all') {
      whereClause.location = location;
    }

    if (status && status !== 'all') {
      whereClause.status = status;
    }

    if (minValue || maxValue) {
      whereClause.currentValue = {};
      if (minValue) whereClause.currentValue.gte = parseFloat(minValue);
      if (maxValue) whereClause.currentValue.lte = parseFloat(maxValue);
    }

    if (depreciationMethod && depreciationMethod !== 'all') {
      whereClause.depreciationMethod = depreciationMethod;
    }

    // Debug: Log the where clause
    console.log('🔍 API Debug: Where clause built:', whereClause);

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

    // Enhanced depreciation data calculation and detailed asset list
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
      ]
    });

    // Fetch book values for all assets for the selected year/month
    let bookValueMap = {};
    let bookValueByDepartment = [];
    let bookValueByCategory = [];
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

        const depreciationResults = calculateDepreciation({
          purchasePrice: depreciableCost,
          purchaseDate: startDate.toISOString(),
          usefulLife: usefulLifeYears,
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
        console.error(`Error calculating depreciation for asset ${asset.id}:`, e);
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

    // Get unique filter options for frontend
    const filterOptions = await prisma.asset.findMany({
      select: {
        category: true,
        currentDepartment: true,
        location: true,
        depreciationMethod: true
      },
      distinct: ['category', 'currentDepartment', 'location', 'depreciationMethod']
    });

    const uniqueCategories = [...new Set(filterOptions.map(item => item.category).filter(Boolean))];
    const uniqueDepartments = [...new Set(filterOptions.map(item => item.currentDepartment).filter(Boolean))];
    const uniqueLocations = [...new Set(filterOptions.map(item => item.location).filter(Boolean))];
    const uniqueDepreciationMethods = [...new Set(filterOptions.map(item => item.depreciationMethod).filter(Boolean))];

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
        bookValue: (year && month) ? (bookValueMap[asset.id] ?? null) : asset.currentValue,
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