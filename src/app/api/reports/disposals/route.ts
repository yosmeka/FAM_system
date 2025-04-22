import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/reports/disposals
export async function GET() {
  try {
    const now = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    // Fetch all required data in parallel
    const [
      currentMonthDisposals,
      lastMonthDisposals,
      currentMonthRecovery,
      lastMonthRecovery,
      methodDistributionData,
      monthlyData,
      categoryData,
    ] = await Promise.all([
      // Current month's disposals
      prisma.disposal.count({
        where: {
          createdAt: {
            gte: new Date(now.getFullYear(), now.getMonth(), 1),
          },
        },
      }),

      // Last month's disposals
      prisma.disposal.count({
        where: {
          createdAt: {
            gte: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1),
            lt: new Date(now.getFullYear(), now.getMonth(), 1),
          },
        },
      }),

      // Current month's recovery value
      prisma.disposal.aggregate({
        where: {
          createdAt: {
            gte: new Date(now.getFullYear(), now.getMonth(), 1),
          },
          status: 'COMPLETED',
        },
        _sum: {
          proceeds: true,
        },
      }),

      // Last month's recovery value
      prisma.disposal.aggregate({
        where: {
          createdAt: {
            gte: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1),
            lt: new Date(now.getFullYear(), now.getMonth(), 1),
          },
          status: 'COMPLETED',
        },
        _sum: {
          proceeds: true,
        },
      }),

      // Method distribution
      prisma.disposal.groupBy({
        by: ['method'],
        _count: {
          id: true,
        },
        where: {
          status: 'COMPLETED',
        },
      }),

      // Monthly trends for the past year
      prisma.disposal.findMany({
        where: {
          createdAt: {
            gte: oneYearAgo,
          },
        },
        select: {
          createdAt: true,
          status: true,
          proceeds: true,
        },
      }),

      // Category-wise disposal data
      prisma.disposal.findMany({
        where: {
          status: 'COMPLETED',
          asset: {
            isNot: null,
          },
        },
        select: {
          method: true,
          proceeds: true,
          asset: {
            select: {
              category: true,
              purchasePrice: true,
            },
          },
        },
      }),
    ]);

    // Calculate disposal growth
    const disposalGrowth =
      lastMonthDisposals > 0
        ? ((currentMonthDisposals - lastMonthDisposals) / lastMonthDisposals) * 100
        : 0;

    // Calculate recovery growth
    const currentRecovery = currentMonthRecovery._sum.proceeds || 0;
    const lastRecovery = lastMonthRecovery._sum.proceeds || 0;
    const recoveryGrowth =
      lastRecovery > 0 ? ((currentRecovery - lastRecovery) / lastRecovery) * 100 : 0;

    // Process method distribution
    const methodDistribution = methodDistributionData.map((method: any) => ({
      method: method.method.replace('_', ' '),
      count: method._count.id,
    }));

    // Process monthly trends
    const monthlyTrends = new Map();
    monthlyData.forEach((disposal: any) => {
      const monthKey = disposal.createdAt.toISOString().slice(0, 7);
      const existing = monthlyTrends.get(monthKey) || {
        count: 0,
        valueRecovered: 0,
      };
      existing.count++;
      if (disposal.status === 'COMPLETED' && disposal.proceeds) {
        existing.valueRecovered += disposal.proceeds;
      }
      monthlyTrends.set(monthKey, existing);
    });

    // Process category-wise value recovery
    const categoryStats = new Map();
    categoryData.forEach((disposal: any) => {
      if (!disposal.asset?.category) return;

      const category = disposal.asset.category;
      const stats = categoryStats.get(category) || {
        disposalCount: 0,
        originalValue: 0,
        recoveredValue: 0,
        methods: new Map(),
      };

      stats.disposalCount++;
      stats.originalValue += disposal.asset.purchasePrice || 0;
      stats.recoveredValue += disposal.proceeds || 0;

      // Track disposal methods
      const methodCount = stats.methods.get(disposal.method) || 0;
      stats.methods.set(disposal.method, methodCount + 1);

      categoryStats.set(category, stats);
    });

    const valueRecovery = Array.from(categoryStats.entries()).map(
      ([category, stats]: [string, any]) => {
        // Find the most common disposal method
        let primaryMethod = '';
        let maxCount = 0;
        stats.methods.forEach((count: number, method: string) => {
          if (count > maxCount) {
            maxCount = count;
            primaryMethod = method;
          }
        });

        return {
          category,
          disposalCount: stats.disposalCount,
          originalValue: stats.originalValue,
          recoveredValue: stats.recoveredValue,
          recoveryRate: (stats.recoveredValue / stats.originalValue) * 100,
          primaryMethod,
        };
      }
    );

    // Calculate overall recovery rate
    const totalOriginalValue = valueRecovery.reduce(
      (sum, item) => sum + item.originalValue,
      0
    );
    const totalRecoveredValue = valueRecovery.reduce(
      (sum, item) => sum + item.recoveredValue,
      0
    );
    const recoveryRate =
      totalOriginalValue > 0 ? (totalRecoveredValue / totalOriginalValue) * 100 : 0;

    return NextResponse.json({
      stats: {
        totalDisposals: currentMonthDisposals,
        pendingDisposals: await prisma.disposal.count({
          where: { status: 'PENDING' },
        }),
        totalRecovered: totalRecoveredValue,
        recoveryRate: Math.round(recoveryRate * 10) / 10,
        disposalGrowth: Math.round(disposalGrowth * 10) / 10,
        recoveryGrowth: Math.round(recoveryGrowth * 10) / 10,
      },
      methodDistribution,
      monthlyTrends: Array.from(monthlyTrends.entries()).map(([month, data]) => ({
        month,
        ...data,
      })),
      valueRecovery: valueRecovery.sort((a, b) => b.originalValue - a.originalValue),
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate disposal reports' },
      { status: 500 }
    );
  }
}
