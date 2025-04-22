import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/reports/transfers
export async function GET() {
  try {
    const now = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    // Fetch all required data in parallel
    const [
      currentMonthTransfers,
      lastMonthTransfers,
      statusCounts,
      monthlyData,
      locationTransferData,
      departmentTransferData,
      completedTransfers,
    ] = await Promise.all([
      // Current month's transfers
      prisma.transfer.count({
        where: {
          createdAt: {
            gte: new Date(now.getFullYear(), now.getMonth(), 1),
          },
        },
      }),

      // Last month's transfers
      prisma.transfer.count({
        where: {
          createdAt: {
            gte: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1),
            lt: new Date(now.getFullYear(), now.getMonth(), 1),
          },
        },
      }),

      // Status distribution
      prisma.transfer.groupBy({
        by: ['status'],
        _count: {
          id: true,
        },
      }),

      // Monthly trends for the past year
      prisma.transfer.findMany({
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

      // Location transfer matrix
      prisma.transfer.groupBy({
        by: ['fromLocation', 'toLocation'],
        _count: {
          id: true,
        },
        where: {
          status: 'COMPLETED',
        },
      }),

      // Department transfer data
      prisma.transfer.findMany({
        where: {
          createdAt: {
            gte: oneYearAgo,
          },
        },
        select: {
          fromDepartment: true,
          toDepartment: true,
          status: true,
          createdAt: true,
          approvedAt: true,
        },
      }),

      // Completed transfers with duration calculation
      prisma.transfer.findMany({
        where: {
          status: 'COMPLETED',
          approvedAt: {
            not: null,
          },
        },
        select: {
          createdAt: true,
          approvedAt: true,
        },
      }),
    ]);

    // Calculate transfer growth
    const transferGrowth =
      lastMonthTransfers > 0
        ? ((currentMonthTransfers - lastMonthTransfers) / lastMonthTransfers) * 100
        : 0;

    // Process location transfer matrix
    const locationTransfers = locationTransferData.map((transfer: any) => ({
      fromLocation: transfer.fromLocation,
      toLocation: transfer.toLocation,
      count: transfer._count.id,
    }));

    // Process monthly trends
    const monthlyTrends = new Map();
    monthlyData.forEach((transfer: any) => {
      const monthKey = transfer.createdAt.toISOString().slice(0, 7);
      const existing = monthlyTrends.get(monthKey) || {
        count: 0,
        approved: 0,
      };
      existing.count++;
      if (transfer.status === 'COMPLETED') {
        existing.approved++;
      }
      monthlyTrends.set(monthKey, existing);
    });

    // Process department transfers
    const departmentStats = new Map();
    departmentTransferData.forEach((transfer: any) => {
      // Handle outgoing transfers
      if (transfer.fromDepartment) {
        const fromDept = departmentStats.get(transfer.fromDepartment) || {
          outgoing: 0,
          incoming: 0,
          processingTimes: [],
        };
        fromDept.outgoing++;
        if (transfer.approvedAt) {
          fromDept.processingTimes.push(
            transfer.approvedAt.getTime() - transfer.createdAt.getTime()
          );
        }
        departmentStats.set(transfer.fromDepartment, fromDept);
      }

      // Handle incoming transfers
      if (transfer.toDepartment) {
        const toDept = departmentStats.get(transfer.toDepartment) || {
          outgoing: 0,
          incoming: 0,
          processingTimes: [],
        };
        toDept.incoming++;
        if (transfer.approvedAt) {
          toDept.processingTimes.push(
            transfer.approvedAt.getTime() - transfer.createdAt.getTime()
          );
        }
        departmentStats.set(transfer.toDepartment, toDept);
      }
    });

    const departmentTransfers = Array.from(departmentStats.entries()).map(
      ([department, stats]: [string, { outgoing: number; incoming: number; processingTimes: number[] }]) => ({
        department,
        outgoing: stats.outgoing,
        incoming: stats.incoming,
        avgProcessingDays:
          stats.processingTimes.length > 0
            ? stats.processingTimes.reduce((sum: number, time: number) => sum + time, 0) /
              stats.processingTimes.length /
              (1000 * 60 * 60 * 24)
            : 0,
      })
    );

    // Calculate average processing time
    const avgProcessingDays =
      completedTransfers.length > 0
        ? completedTransfers.reduce((sum: number, transfer: { createdAt: Date; approvedAt: Date }) => {
            const duration = transfer.approvedAt!.getTime() - transfer.createdAt.getTime();
            return sum + duration / (1000 * 60 * 60 * 24); // Convert to days
          }, 0) / completedTransfers.length
        : 0;

    // Calculate approval rate
    const totalTransfers = statusCounts.reduce((sum: number, status: { _count: { id: number } }) => sum + status._count.id, 0);
    const approvedCount =
      statusCounts.find((s: { status: string }) => s.status === 'COMPLETED')?._count.id || 0;
    const approvalRate = totalTransfers > 0 ? (approvedCount / totalTransfers) * 100 : 0;

    return NextResponse.json({
      stats: {
        totalTransfers,
        pendingTransfers:
          statusCounts.find((s: any) => s.status === 'PENDING')?._count.id || 0,
        avgProcessingDays: Math.round(avgProcessingDays * 10) / 10,
        approvalRate: Math.round(approvalRate),
        transferGrowth: Math.round(transferGrowth * 10) / 10,
      },
      locationTransfers,
      monthlyTrends: Array.from(monthlyTrends.entries()).map(([month, data]) => ({
        month,
        ...data,
      })),
      departmentTransfers,
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate transfer reports' },
      { status: 500 }
    );
  }
}
