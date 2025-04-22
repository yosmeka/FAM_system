import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/reports/maintenance
export async function GET() {
  try {
    const now = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    // Fetch all required data in parallel
    const [
      currentMonthRequests,
      lastMonthRequests,
      statusCounts,
      monthlyData,
      topMaintenanceAssets,
      completedRequests,
    ] = await Promise.all([
      // Current month's requests
      prisma.maintenance.count({
        where: {
          createdAt: {
            gte: new Date(now.getFullYear(), now.getMonth(), 1),
          },
        },
      }),

      // Last month's requests
      prisma.maintenance.count({
        where: {
          createdAt: {
            gte: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1),
            lt: new Date(now.getFullYear(), now.getMonth(), 1),
          },
        },
      }),

      // Status distribution
      prisma.maintenance.groupBy({
        by: ['status'],
        _count: {
          id: true,
        },
      }),

      // Monthly trends for the past year
      prisma.maintenance.findMany({
        where: {
          createdAt: {
            gte: oneYearAgo,
          },
        },
        select: {
          createdAt: true,
          status: true,
        },
      }),

      // Top assets requiring maintenance
      prisma.asset.findMany({
        take: 10,
        select: {
          id: true,
          name: true,
          lastMaintenance: true,
          nextMaintenance: true,
          _count: {
            select: {
              maintenanceRequests: true,
            },
          },
          maintenanceRequests: {
            select: {
              cost: true,
            },
            where: {
              cost: {
                not: null,
              },
            },
          },
        },
        orderBy: {
          maintenanceRequests: {
            _count: 'desc',
          },
        },
      }),

      // Completed requests with duration calculation
      prisma.maintenance.findMany({
        where: {
          status: 'COMPLETED',
          startDate: {
            not: null,
          },
          endDate: {
            not: null,
          },
        },
        select: {
          startDate: true,
          endDate: true,
        },
      }),
    ]);

    // Calculate request growth
    const requestGrowth =
      lastMonthRequests > 0
        ? ((currentMonthRequests - lastMonthRequests) / lastMonthRequests) * 100
        : 0;

    // Process status distribution
    const statusDistribution = statusCounts.map((status: { status: string; _count: { id: number } }) => ({
      status: status.status,
      count: status._count.id,
    }));

    // Calculate average resolution time
    const avgResolutionDays =
      completedRequests.length > 0
        ? completedRequests.reduce((sum: number, request: any) => {
            const duration = request.endDate!.getTime() - request.startDate!.getTime();
            return sum + duration / (1000 * 60 * 60 * 24); // Convert to days
          }, 0) / completedRequests.length
        : 0;

    // Process monthly trends
    const monthlyTrends = new Map();
    monthlyData.forEach((request: any) => {
      const monthKey = request.createdAt.toISOString().slice(0, 7);
      const existing = monthlyTrends.get(monthKey) || {
        count: 0,
        completed: 0,
      };
      existing.count++;
      if (request.status === 'COMPLETED') {
        existing.completed++;
      }
      monthlyTrends.set(monthKey, existing);
    });

    // Process top assets data
    const topAssets = topMaintenanceAssets.map((asset: any) => ({
      id: asset.id,
      name: asset.name,
      totalRequests: asset._count.maintenanceRequests,
      lastMaintenance: asset.lastMaintenance,
      averageCost:
        asset.maintenanceRequests.length > 0
          ? asset.maintenanceRequests.reduce((sum: number, req: any) => sum + (req.cost || 0), 0) /
            asset.maintenanceRequests.length
          : null,
      status: asset.nextMaintenance && asset.nextMaintenance <= now ? 'Due' : 'OK',
    }));

    // Calculate completion rate
    const totalRequests = statusCounts.reduce((sum: number, status: any) => sum + status._count.id, 0);
    const completedCount =
      statusCounts.find((s: any) => s.status === 'COMPLETED')?._count.id || 0;
    const completionRate = totalRequests > 0 ? (completedCount / totalRequests) * 100 : 0;

    return NextResponse.json({
      stats: {
        totalRequests,
        pendingRequests:
          statusCounts.find((s: any) => s.status === 'PENDING')?._count.id || 0,
        avgResolutionDays: Math.round(avgResolutionDays * 10) / 10,
        completionRate: Math.round(completionRate),
        requestGrowth: Math.round(requestGrowth * 10) / 10,
      },
      statusDistribution,
      monthlyTrends: Array.from(monthlyTrends.entries()).map(([month, data]) => ({
        month,
        ...data,
      })),
      topAssets,
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate maintenance reports' },
      { status: 500 }
    );
  }
}
