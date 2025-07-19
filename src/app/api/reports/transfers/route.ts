// //import { Response } from 'next/server';
// import { prisma } from '@/lib/prisma';

// interface DepartmentMatrixTransfer {
//   fromDepartment: string | null;
//   toDepartment: string | null;
//   _count: { id: number };
// }
// interface MonthlyTransfer {
//   createdAt: Date;
//   status: string;
// }
// interface DepartmentTransfer {
//   fromDepartment: string | null;
//   toDepartment: string | null;
//   status: string;
//   createdAt: Date;
//   updatedAt: Date;
// }

// // GET /api/reports/transfers
// export async function GET() {
//   try {
//     const now = new Date();
//     const previousMonth = new Date();
//     previousMonth.setMonth(previousMonth.getMonth() - 1);
//     const oneYearAgo = new Date();
//     oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

//     // Fetch all required data in parallel
//     const [
//       currentMonthTransfersCount,
//       lastMonthTransfersCount,
//       statusCounts,
//       monthlyData,
//       departmentMatrixData,
//       departmentTransferData,
//       completedTransfers,
//       allTransfers,
//     ] = await Promise.all([
//       // Current month's transfers
//       prisma.transfer.count({
//         where: {
//           createdAt: {
//             gte: new Date(now.getFullYear(), now.getMonth(), 1),
//           },
//         },
//       }),

//       // Last month's transfers
//       prisma.transfer.count({
//         where: {
//           createdAt: {
//             gte: new Date(previousMonth.getFullYear(), previousMonth.getMonth(), 1),
//             lt: new Date(now.getFullYear(), now.getMonth(), 1),
//           },
//         },
//       }),

//       // Status distribution
//       prisma.transfer.groupBy({
//         by: ['status'],
//         _count: {
//           id: true,
//         },
//       }),

//       // Monthly trends for the past year
//       prisma.transfer.findMany({
//         where: {
//           createdAt: {
//             gte: oneYearAgo,
//           },
//         },
//         select: {
//           createdAt: true,
//           status: true,
//         },
//       }),

//       // Location transfer matrix
//       prisma.transfer.groupBy({
//         by: ['fromDepartment', 'toDepartment'],
//         _count: {
//           id: true,
//         },
//       }),

//       // Location transfer data
//       prisma.transfer.findMany({
//         where: {
//           createdAt: {
//             gte: oneYearAgo,
//           },
//         },
//         select: {
//           fromDepartment: true,
//           toDepartment: true,
//           status: true,
//           createdAt: true,
//           updatedAt: true,
//         },
//       }),

//       // Completed transfers with duration calculation
//       prisma.transfer.findMany({
//         where: {
//           status: 'COMPLETED',
//         },
//         select: {
//           createdAt: true,
//           updatedAt: true,
//         },
//       }),

//       // All transfers with asset and requester details
//       prisma.transfer.findMany({
//         select: {
//           id: true,
//           asset: {
//             select: {
//               name: true,
//             }
//           },
//           fromDepartment: true,
//           toDepartment: true,
//           status: true,
//           createdAt: true,
//           requester: {
//             select: {
//               name: true,
//             }
//           }
//         },
//         orderBy: {
//           createdAt: 'desc'
//         }
//       }),
//     ]);

//     // Process the transfers data
//     const transfers = allTransfers.map((transfer: {
//       asset?: { name: string | null };
//       fromDepartment: string | null;
//       toDepartment: string | null;
//       status: string;
//       createdAt: Date;
//       requester?: { name: string | null };
//     }) => ({
//       assetName: transfer.asset?.name || 'Unknown Asset',
//       fromDepartment: transfer.fromDepartment || 'Unknown',
//       toDepartment: transfer.toDepartment || 'Unknown',
//       status: transfer.status,
//       createdAt: transfer.createdAt,
//       requesterName: transfer.requester?.name || 'Unknown'
//     }));

//     // Process monthly trends
//     const monthlyTrends = new Map();
//     monthlyData.forEach((transfer: MonthlyTransfer) => {
//       const monthKey = transfer.createdAt.toISOString().slice(0, 7);
//       const existing = monthlyTrends.get(monthKey) || {
//         count: 0,
//         approved: 0,
//       };
//       existing.count++;
//       if (transfer.status === 'COMPLETED') {
//         existing.approved++;
//       }
//       monthlyTrends.set(monthKey, existing);
//     });

//     // Process location transfers
//     const locationStats = new Map();
//     departmentTransferData.forEach((transfer: DepartmentTransfer) => {
//       if (transfer.fromDepartment) {
//         const fromLocation = locationStats.get(transfer.fromDepartment) || {
//           outgoing: 0,
//           incoming: 0,
//           processingTimes: [],
//         };
//         fromLocation.outgoing++;
//         if (transfer.status === 'COMPLETED') {
//           fromLocation.processingTimes.push(
//             transfer.updatedAt.getTime() - transfer.createdAt.getTime()
//           );
//         }
//         locationStats.set(transfer.fromDepartment, fromLocation);
//       }

//       if (transfer.toDepartment) {
//         const toLocation = locationStats.get(transfer.toDepartment) || {
//           outgoing: 0,
//           incoming: 0,
//           processingTimes: [],
//         };
//         toLocation.incoming++;
//         if (transfer.status === 'COMPLETED') {
//           toLocation.processingTimes.push(
//             transfer.updatedAt.getTime() - transfer.createdAt.getTime()
//           );
//         }
//         locationStats.set(transfer.toDepartment, toLocation);
//       }
//     });

//     const departmentTransfers = Array.from(locationStats.entries()).map(
//       ([department, stats]: [string, { outgoing: number; incoming: number; processingTimes: number[] }]) => ({
//         department,
//         outgoing: stats.outgoing,
//         incoming: stats.incoming,
//         avgProcessingDays:
//           stats.processingTimes.length > 0
//             ? stats.processingTimes.reduce((sum: number, time: number) => sum + time, 0) /
//             stats.processingTimes.length /
//             (1000 * 60 * 60 * 24)
//             : 0,
//       })
//     );

//     // Calculate statistics
//     const totalTransfers = statusCounts.reduce((sum: number, status: { _count: { id: number } }) => sum + status._count.id, 0);
//     const approvedCount = statusCounts.find((s: { status: string }) => s.status === 'COMPLETED')?._count.id || 0;
//     const rejectedCount = statusCounts.find((s: { status: string }) => s.status === 'REJECTED')?._count.id || 0;
//     const decidedTransfers = approvedCount + rejectedCount;
//     const approvalRate = decidedTransfers > 0 ? Math.round((approvedCount / decidedTransfers) * 100) : 0;
//     const avgProcessingDays = completedTransfers.length > 0
//       ? completedTransfers.reduce((sum: number, transfer: { createdAt: Date; updatedAt: Date }) => {
//         const duration = transfer.updatedAt.getTime() - transfer.createdAt.getTime();
//         return sum + duration / (1000 * 60 * 60 * 24);
//       }, 0) / completedTransfers.length
//       : 0;

//     return Response.json({
//       stats: {
//         totalTransfers: currentMonthTransfersCount,
//         pendingTransfers: statusCounts.find((s: { status: string }) => s.status === 'PENDING')?._count.id || 0,
//         inProgressTransfers: statusCounts.find((s: { status: string }) => s.status === 'IN_PROGRESS')?._count.id || 0,
//         completedTransfers: approvedCount,
//         rejectedTransfers: rejectedCount,
//         cancelledTransfers: statusCounts.find((s: { status: string }) => s.status === 'CANCELLED')?._count.id || 0,
//         avgProcessingDays: Math.round(avgProcessingDays * 100) / 100,
//         avgTimeToApprovalHours: Math.round(avgProcessingDays * 24 * 100) / 100,
//         approvalRate: approvalRate,
//         rejectionRate: decidedTransfers > 0 ? Math.round((rejectedCount / decidedTransfers) * 100) : 0,
//         transferEfficiency: approvalRate,
//         transferVelocity: Math.round((currentMonthTransfersCount / 30) * 100) / 100,
//         transferGrowth: lastMonthTransfersCount > 0
//           ? Math.round(((currentMonthTransfersCount - lastMonthTransfersCount) / lastMonthTransfersCount) * 100 * 100) / 100
//           : 0,
//       },
//       monthlyTrends: Array.from(monthlyTrends.entries()).map(([month, data]) => ({
//         month,
//         count: data.count,
//         approved: data.approved,
//         rejected: data.count - data.approved,
//         approvalRate: data.count > 0 ? Math.round((data.approved / data.count) * 100) : 0,
//       })),
//       departmentTransferMatrix: departmentMatrixData.map((transfer: DepartmentMatrixTransfer) => ({
//         fromDepartment: transfer.fromDepartment || 'Unknown',
//         toDepartment: transfer.toDepartment || 'Unknown',
//         count: transfer._count.id,
//       })),
//       departmentTransfers,
//       statusDistribution: statusCounts.map((status: { status: string; _count: { id: number } }) => ({
//         status: status.status,
//         count: status._count.id,
//         percentage: Math.round((status._count.id / totalTransfers) * 100),
//       })),
//       transfers,
//     });
//   } catch (error) {
//     console.error('Error in transfer reports:', error);
//     return Response.json(
//       { error: 'Failed to fetch transfer reports' },
//       { status: 500 }
//     );
//   }
// }
