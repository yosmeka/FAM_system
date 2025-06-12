import { NextResponse } from 'next/server';
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

    // Debug logging
    console.log('🔍 API Debug: Received query parameters:', {
      startDate, endDate, category, department, location, status, minValue, maxValue, depreciationMethod
    });

    // Build where clause for filtering
    const whereClause = {};

    if (startDate && endDate) {
      whereClause.purchaseDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    if (category && category !== 'all') {
      whereClause.category = category;
    }

    if (department && department !== 'all') {
      whereClause.department = department;
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
      by: ['department', 'status'],
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
        serialNumber: true,
        category: true,
        status: true,
        location: true,
        department: true,
        purchaseDate: true,
        purchasePrice: true,
        currentValue: true,
        depreciableCost: true,
        salvageValue: true,
        usefulLifeMonths: true,
        depreciationMethod: true,
        depreciationStartDate: true,
        supplier: true,
        warrantyExpiry: true
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });

    // Calculate actual depreciation data for each asset
    const depreciationData = [];
    const monthlyDepreciation = new Map();

    for (const asset of assets) {
      try {
        const depreciableCost = asset.depreciableCost || asset.purchasePrice;
        const salvageValue = asset.salvageValue || 0;
        const usefulLifeYears = asset.usefulLifeMonths ? Math.ceil(asset.usefulLifeMonths / 12) : 5;
        const method = asset.depreciationMethod || 'STRAIGHT_LINE';
        const startDate = asset.depreciationStartDate || asset.purchaseDate;

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
      } catch (error) {
        console.error(`Error calculating depreciation for asset ${asset.id}:`, error);
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

    // Total purchase value with filters
    const totalPurchaseValue = await prisma.asset.aggregate({
      where: whereClause,
      _sum: { purchasePrice: true }
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
          SELECT AVG(EXTRACT(YEAR FROM AGE(NOW(), "purchaseDate"))) as avg_age
          FROM "Asset"
        `;
      } else {
        // For filtered queries, calculate age manually
        const assetsForAge = await prisma.asset.findMany({
          where: whereClause,
          select: { purchaseDate: true }
        });

        if (assetsForAge.length > 0) {
          const totalAge = assetsForAge.reduce((sum, asset) => {
            const ageInYears = (now.getTime() - asset.purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
            return sum + ageInYears;
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
    const totalROI = totalPurchaseValue._sum.purchasePrice > 0
      ? ((totalValue._sum.currentValue - (maintenanceCost._sum.cost || 0)) / totalPurchaseValue._sum.purchasePrice) * 100
      : 0;

    // Get unique filter options for frontend
    const filterOptions = await prisma.asset.findMany({
      select: {
        category: true,
        department: true,
        location: true,
        depreciationMethod: true
      },
      distinct: ['category', 'department', 'location', 'depreciationMethod']
    });

    const uniqueCategories = [...new Set(filterOptions.map(item => item.category).filter(Boolean))];
    const uniqueDepartments = [...new Set(filterOptions.map(item => item.department).filter(Boolean))];
    const uniqueLocations = [...new Set(filterOptions.map(item => item.location).filter(Boolean))];
    const uniqueDepreciationMethods = [...new Set(filterOptions.map(item => item.depreciationMethod).filter(Boolean))];

    const formattedData = {
      stats: {
        totalAssets,
        activeAssets,
        totalValue: totalValue._sum.currentValue ?? 0,
        totalPurchaseValue: totalPurchaseValue._sum.purchasePrice ?? 0,
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
        category: item.department || 'Unassigned',
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
        serialNumber: asset.serialNumber,
        category: asset.category,
        status: asset.status,
        location: asset.location,
        department: asset.department,
        purchaseDate: asset.purchaseDate.toISOString().split('T')[0],
        purchasePrice: asset.purchasePrice,
        currentValue: asset.currentValue,
        depreciationMethod: asset.depreciationMethod,
        supplier: asset.supplier,
        warrantyExpiry: asset.warrantyExpiry ? asset.warrantyExpiry.toISOString().split('T')[0] : null,
        usefulLifeYears: asset.usefulLifeMonths ? Math.ceil(asset.usefulLifeMonths / 12) : null,
        age: asset.purchaseDate ? Math.floor((now - asset.purchaseDate) / (1000 * 60 * 60 * 24 * 365.25)) : 0,
        depreciationRate: asset.purchasePrice > 0 ?
          ((asset.purchasePrice - asset.currentValue) / asset.purchasePrice * 100).toFixed(1) : 0
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
        averageDepreciationRate: totalPurchaseValue._sum.purchasePrice > 0 ?
          (totalDepreciation / totalPurchaseValue._sum.purchasePrice) * 100 : 0,
        assetTurnover: totalPurchaseValue._sum.purchasePrice > 0 ?
          (totalValue._sum.currentValue / totalPurchaseValue._sum.purchasePrice) : 0
      }
    };

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('Error fetching asset reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch asset reports' },
      { status: 500 }
    );
  }
});