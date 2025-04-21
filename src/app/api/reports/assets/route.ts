import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/reports/assets
export async function GET() {
  try {
    // Get current date and last month's date
    const now = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    // Fetch all required data in parallel
    const [
      currentAssets,
      lastMonthAssets,
      assetsByCategory,
      assetsByDepartment,
      maintenanceDue,
      depreciationData,
    ] = await Promise.all([
      // Current month's assets
      prisma.asset.findMany({
        where: {
          createdAt: {
            lte: now,
          },
        },
      }),

      // Last month's assets
      prisma.asset.findMany({
        where: {
          createdAt: {
            lte: lastMonth,
          },
        },
      }),

      // Assets grouped by category
      prisma.asset.groupBy({
        by: ['category'],
        _count: {
          id: true,
        },
        _sum: {
          currentValue: true,
        },
      }),

      // Assets grouped by department
      prisma.asset.groupBy({
        by: ['department'],
        _count: {
          id: true,
        },
        _sum: {
          currentValue: true,
        },
      }),

      // Assets due for maintenance
      prisma.asset.count({
        where: {
          nextMaintenance: {
            lte: now,
          },
          status: 'ACTIVE',
        },
      }),

      // Depreciation data for the last 12 months
      prisma.depreciation.findMany({
        where: {
          date: {
            gte: new Date(now.getFullYear(), now.getMonth() - 11, 1),
          },
        },
        orderBy: {
          date: 'asc',
        },
      }),
    ]);

    // Calculate total values and growth
    const currentTotalValue = currentAssets.reduce((sum: number, asset: any) => sum + asset.currentValue, 0);
    const lastMonthTotalValue = lastMonthAssets.reduce((sum: number, asset: any) => sum + asset.currentValue, 0);
    const valueGrowth = ((currentTotalValue - lastMonthTotalValue) / lastMonthTotalValue) * 100;
    const assetGrowth = ((currentAssets.length - lastMonthAssets.length) / lastMonthAssets.length) * 100;

    // Process category data
    const categoryData = assetsByCategory.map((category: any) => ({
      category: category.category || 'Uncategorized',
      count: category._count.id,
      value: category._sum.currentValue || 0,
    }));

    // Process department data
    const departmentData = assetsByDepartment.map((dept: any) => ({
      department: dept.department || 'Unassigned',
      count: dept._count.id,
      value: dept._sum.currentValue || 0,
    }));

    // Process depreciation data by month
    const depreciationByMonth = new Map();
    depreciationData.forEach((dep: any) => {
      const monthKey = dep.date.toISOString().slice(0, 7); // YYYY-MM format
      const existing = depreciationByMonth.get(monthKey) || { depreciation: 0, bookValue: 0 };
      depreciationByMonth.set(monthKey, {
        depreciation: existing.depreciation + dep.amount,
        bookValue: dep.bookValue, // Use the latest book value for the month
      });
    });

    const depreciationTrend = Array.from(depreciationByMonth.entries()).map(([month, data]) => ({
      month,
      ...data,
    }));

    return NextResponse.json({
      stats: {
        totalAssets: currentAssets.length,
        totalValue: currentTotalValue,
        activeAssets: currentAssets.filter((a: any) => a.status === 'ACTIVE').length,
        maintenanceDue,
        assetGrowth,
        valueGrowth,
      },
      byCategory: categoryData,
      byDepartment: departmentData,
      depreciation: depreciationTrend,
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate asset reports' },
      { status: 500 }
    );
  }
}
