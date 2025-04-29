import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/reports/assets
export async function GET() {
  try {
    const now = new Date();
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    // Get total and active asset counts
    const totalAssets = await prisma.asset.count();
    const activeAssets = await prisma.asset.count({
      where: { status: 'ACTIVE' }
    });

    // Assets by category
    const assetsByCategory = await prisma.asset.groupBy({
      by: ['category', 'status'],
      _count: { id: true },
      _sum: { currentValue: true }
    });

    // Assets by department
    const assetsByDepartment = await prisma.asset.groupBy({
      by: ['department', 'status'],
      _count: { id: true },
      _sum: { currentValue: true }
    });

    // Asset status distribution
    const statusDistribution = await prisma.asset.groupBy({
      by: ['status'],
      _count: { id: true }
    });

    // Depreciation data (last 12 months)
    const depreciationData = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', "purchaseDate") as month,
        SUM("currentValue") as total_current_value,
        SUM("purchasePrice") as total_purchase_price
      FROM "Asset"
      WHERE "purchaseDate" >= ${twelveMonthsAgo}
      GROUP BY DATE_TRUNC('month', "purchaseDate")
      ORDER BY month ASC
    `;

    // Total current value
    const totalValue = await prisma.asset.aggregate({
      _sum: { currentValue: true }
    });

    // Total maintenance cost
    const maintenanceCost = await prisma.maintenance.aggregate({
      _sum: { cost: true }
    });

    // Asset count 12 months ago (for growth)
    const pastAssets = await prisma.asset.count({
      where: {
        createdAt: {
          lt: twelveMonthsAgo
        }
      }
    });

    // Value 12 months ago (sum of currentValue of assets purchased before 12 months)
    const pastValueResult = await prisma.asset.aggregate({
      where: {
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

    const totalDepreciation = depreciationData.reduce((acc, item) => {
      return acc + (item.total_purchase_price - item.total_current_value);
    }, 0);

    const formattedData = {
      stats: {
        totalAssets,
        activeAssets,
        totalValue: totalValue._sum.currentValue ?? 0,
        maintenanceCost: maintenanceCost._sum.cost ?? 0,
        assetGrowth,
        valueGrowth,
        totalDepreciation
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
        count: item._count.id
      })),
      depreciation: depreciationData.map(item => ({
        month: item.month.toISOString().split('T')[0],
        value: parseFloat(item.total_current_value),
        depreciation: parseFloat(item.total_purchase_price - item.total_current_value)
      }))
    };

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('Error fetching asset reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch asset reports' },
      { status: 500 }
    );
  }
}
