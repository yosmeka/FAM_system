//import { Response } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/reports/transfers
export async function GET() {
  try {
    const now = new Date();
    const previousMonth = new Date();
    previousMonth.setMonth(previousMonth.getMonth() - 1);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    // Fetch all required data in parallel
    const [
      currentMonthTransfersCount,
      lastMonthTransfersCount,
      statusCounts,
      monthlyData,
      departmentMatrixData,
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
            gte: new Date(previousMonth.getFullYear(), previousMonth.getMonth(), 1),
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
        by: ['fromDepartment', 'toDepartment'],
        _count: {
          id: true,
        },
        // Include all transfers, not just completed ones
      }),

      // Location transfer data
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
          updatedAt: true, // Using updatedAt as a proxy for completion time
        },
      }),

      // Completed transfers with duration calculation
      prisma.transfer.findMany({
        where: {
          status: 'COMPLETED',
        },
        select: {
          createdAt: true,
          updatedAt: true, // Using updatedAt as a proxy for completion time
        },
      }),
    ]);

    // Process monthly trends first
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

    // If no monthly data, add some placeholder data
    if (monthlyTrends.size === 0) {
      // Add data for the last 6 months
      for (let i = 0; i < 6; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toISOString().slice(0, 7);
        monthlyTrends.set(monthKey, { count: 0, approved: 0 });
      }
    }

    // Get current and last month for growth calculation
    const currentDate = new Date();
    const currentMonth = currentDate.toISOString().slice(0, 7);

    const lastMonthDate = new Date();
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    const lastMonth = lastMonthDate.toISOString().slice(0, 7);

    // Get transfer counts for current and last month
    const currentMonthTransfers = monthlyTrends.get(currentMonth)?.count || 0;
    const lastMonthTransfers = monthlyTrends.get(lastMonth)?.count || 0;

    // Calculate transfer growth using the database counts
    const transferGrowth =
      lastMonthTransfersCount > 0
        ? ((currentMonthTransfersCount - lastMonthTransfersCount) / lastMonthTransfersCount) * 100
        : 0;

    // Ensure transfer growth is a valid number
    const validTransferGrowth = isNaN(transferGrowth) ? 0 : transferGrowth;

    // Process location transfer matrix
    let locationTransferMatrix = departmentMatrixData.map((transfer: any) => ({
      fromDepartment: transfer.fromDepartment || 'Unknown',
      toDepartment: transfer.toDepartment || 'Unknown',
      count: transfer._count.id,
    }));

    // If no data, add some placeholder data to ensure the chart renders
    if (locationTransferMatrix.length === 0) {
      locationTransferMatrix = [
        { fromDepartment: 'New York', toDepartment: 'Los Angeles', count: 0 },
        { fromDepartment: 'New York', toDepartment: 'Chicago', count: 0 },
        { fromDepartment: 'Los Angeles', toDepartment: 'New York', count: 0 },
        { fromDepartment: 'Chicago', toDepartment: 'New York', count: 0 },
      ];
    }

    // Monthly trends have already been processed above

    // Process location transfers
    const locationStats = new Map();
    departmentTransferData.forEach((transfer: any) => {
      // Handle outgoing transfers
      if (transfer.fromDepartment) {
        const fromLocation = locationStats.get(transfer.fromDepartment) || {
          outgoing: 0,
          incoming: 0,
          processingTimes: [],
        };
        fromLocation.outgoing++;
        if (transfer.status === 'COMPLETED') {
          fromLocation.processingTimes.push(
            transfer.updatedAt.getTime() - transfer.createdAt.getTime()
          );
        }
        locationStats.set(transfer.fromDepartment, fromLocation);
      }

      // Handle incoming transfers
      if (transfer.toDepartment) {
        const toLocation = locationStats.get(transfer.toDepartment) || {
          outgoing: 0,
          incoming: 0,
          processingTimes: [],
        };
        toLocation.incoming++;
        if (transfer.status === 'COMPLETED') {
          toLocation.processingTimes.push(
            transfer.updatedAt.getTime() - transfer.createdAt.getTime()
          );
        }
        locationStats.set(transfer.toDepartment, toLocation);
      }
    });

    let departmentTransfers = Array.from(locationStats.entries()).map(
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

    // If no location transfers, add some placeholder data
    if (departmentTransfers.length === 0) {
      departmentTransfers = [
        { department: 'New York', outgoing: 0, incoming: 0, avgProcessingDays: 0 },
        { department: 'Los Angeles', outgoing: 0, incoming: 0, avgProcessingDays: 0 },
        { department: 'Chicago', outgoing: 0, incoming: 0, avgProcessingDays: 0 },
        { department: 'Houston', outgoing: 0, incoming: 0, avgProcessingDays: 0 },
      ];
    }

    // Calculate average processing time
    const avgProcessingDays =
      completedTransfers.length > 0
        ? completedTransfers.reduce((sum: number, transfer: { createdAt: Date; updatedAt: Date }) => {
            const duration = transfer.updatedAt.getTime() - transfer.createdAt.getTime();
            return sum + duration / (1000 * 60 * 60 * 24); // Convert to days
          }, 0) / completedTransfers.length
        : 0;

    // Calculate approval rate
    const totalTransfers = statusCounts.reduce((sum: number, status: { _count: { id: number } }) => sum + status._count.id, 0);

    // Count completed and rejected transfers
    const approvedCount = statusCounts.find((s: { status: string }) => s.status === 'COMPLETED')?._count.id || 0;
    const rejectedCount = statusCounts.find((s: { status: string }) => s.status === 'REJECTED')?._count.id || 0;

    // Calculate approval rate based on completed transfers out of the total of completed + rejected
    // This gives a more accurate approval rate since pending transfers haven't been decided yet
    const decidedTransfers = approvedCount + rejectedCount;
    const approvalRate = decidedTransfers > 0
      ? Math.round((approvedCount / decidedTransfers) * 100)
      : 0;

    // Ensure approval rate is a valid number
    const validApprovalRate = isNaN(approvalRate) ? 0 : approvalRate;

    // Calculate additional statistics
    const pendingCount = statusCounts.find((s: { status: string }) => s.status === 'PENDING')?._count.id || 0;
    const inProgressCount = statusCounts.find((s: { status: string }) => s.status === 'IN_PROGRESS')?._count.id || 0;
    const cancelledCount = statusCounts.find((s: { status: string }) => s.status === 'CANCELLED')?._count.id || 0;

    // Calculate average time to approval
    const avgTimeToApproval = completedTransfers.length > 0
      ? completedTransfers.reduce((sum: number, transfer: { createdAt: Date; updatedAt: Date }) => {
          const duration = transfer.updatedAt.getTime() - transfer.createdAt.getTime();
          return sum + duration / (1000 * 60 * 60); // Convert to hours
        }, 0) / completedTransfers.length
      : 0;

    // Ensure average time to approval is a valid number
    const validAvgTimeToApproval = isNaN(avgTimeToApproval) ? 0 : avgTimeToApproval;

    // Calculate rejection rate
    const rejectionRate = decidedTransfers > 0
      ? Math.round((rejectedCount / decidedTransfers) * 100)
      : 0;

    // Ensure rejection rate is a valid number
    const validRejectionRate = isNaN(rejectionRate) ? 0 : rejectionRate;

    // Calculate transfer efficiency (completed transfers / total transfers)
    const transferEfficiency = totalTransfers > 0
      ? Math.round((approvedCount / totalTransfers) * 100)
      : 0;

    // Ensure transfer efficiency is a valid number
    const validTransferEfficiency = isNaN(transferEfficiency) ? 0 : transferEfficiency;

    // Calculate transfer velocity (transfers per day over the last month)
    const daysInMonth = 30;
    // Use the count from the current month data that we already have
    const transferVelocity = currentMonthTransfersCount / daysInMonth;

    // Ensure transfer velocity is a valid number
    const validTransferVelocity = isNaN(transferVelocity) ? 0 : transferVelocity;

    return Response.json({
      stats: {
        totalTransfers,
        pendingTransfers: pendingCount,
        inProgressTransfers: inProgressCount,
        completedTransfers: approvedCount,
        rejectedTransfers: rejectedCount,
        cancelledTransfers: cancelledCount,
        avgProcessingDays: Math.round(avgProcessingDays * 10) / 10,
        avgTimeToApprovalHours: Math.round(validAvgTimeToApproval),
        approvalRate: validApprovalRate,
        rejectionRate: validRejectionRate,
        transferEfficiency: validTransferEfficiency,
        transferVelocity: Math.round(validTransferVelocity * 10) / 10, // Round to 1 decimal place
        transferGrowth: Math.round(validTransferGrowth * 10) / 10,
      },
      statusDistribution: statusCounts.length > 0
        ? statusCounts.map((status: any) => ({
            status: status.status,
            count: status._count.id,
            percentage: Math.round((status._count.id / totalTransfers) * 100)
          }))
        : [
            { status: 'PENDING', count: 0, percentage: 0 },
            { status: 'IN_PROGRESS', count: 0, percentage: 0 },
            { status: 'COMPLETED', count: 0, percentage: 0 },
            { status: 'REJECTED', count: 0, percentage: 0 },
            { status: 'CANCELLED', count: 0, percentage: 0 },
          ],
      departmentTransferMatrix: locationTransferMatrix,
      monthlyTrends: Array.from(monthlyTrends.entries())
        .map(([month, data]) => {
          const count = data.count || 0;
          const approved = data.approved || 0;
          const rejected = count - approved;
          const approvalRate = count > 0 ? Math.round((approved / count) * 100) : 0;

          return {
            month,
            count,
            approved,
            rejected,
            approvalRate: isNaN(approvalRate) ? 0 : approvalRate
          };
        })
        .sort((a, b) => a.month.localeCompare(b.month)),
      departmentTransfers,
      timeAnalysis: {
        avgProcessingDays: Math.round(avgProcessingDays * 10) / 10,
        avgTimeToApprovalHours: Math.round(validAvgTimeToApproval),
        fastestTransfer: completedTransfers.length > 0
          ? Math.round(Math.min(...completedTransfers.map(t => {
              const duration = t.updatedAt.getTime() - t.createdAt.getTime();
              return duration > 0 ? duration : Number.MAX_SAFE_INTEGER;
            }).filter(d => d !== Number.MAX_SAFE_INTEGER)) / (1000 * 60 * 60) * 10) / 10 || 0
          : 0,
        slowestTransfer: completedTransfers.length > 0
          ? Math.round(Math.max(...completedTransfers.map(t => t.updatedAt.getTime() - t.createdAt.getTime())) / (1000 * 60 * 60) * 10) / 10 || 0
          : 0,
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json(
      { error: 'Failed to generate transfer reports' },
      { status: 500 }
    );
  }
}
