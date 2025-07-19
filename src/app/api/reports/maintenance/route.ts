// //import { Response } from 'next/server';
// import { prisma } from '@/lib/prisma';

// // Helper function to format time ago
// function getTimeAgo(date: Date): string {
//   const now = new Date();
//   const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

//   if (diffInSeconds < 60) {
//     return `${diffInSeconds} seconds ago`;
//   }

//   const diffInMinutes = Math.floor(diffInSeconds / 60);
//   if (diffInMinutes < 60) {
//     return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
//   }

//   const diffInHours = Math.floor(diffInMinutes / 60);
//   if (diffInHours < 24) {
//     return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
//   }

//   const diffInDays = Math.floor(diffInHours / 24);
//   if (diffInDays < 30) {
//     return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
//   }

//   const diffInMonths = Math.floor(diffInDays / 30);
//   if (diffInMonths < 12) {
//     return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
//   }

//   const diffInYears = Math.floor(diffInMonths / 12);
//   return `${diffInYears} year${diffInYears > 1 ? 's' : ''} ago`;
// }

// // GET /api/reports/maintenance
// export async function GET() {
//   try {
//     console.log("Maintenance reports API called");
//     const now = new Date();
//     const lastMonth = new Date();
//     lastMonth.setMonth(lastMonth.getMonth() - 1);
//     const oneYearAgo = new Date();
//     oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

//     // Fetch basic maintenance data first
//     console.log("Fetching maintenance data...");

//     // Get all maintenance records
//     const allMaintenanceRecords = await prisma.maintenance.findMany({
//       include: {
//         asset: {
//           select: {
//             id: true,
//             name: true,
//             serialNumber: true,
//             department: true,
//             category: true,
//             lastMaintenance: true,
//             nextMaintenance: true,
//           },
//         },
//         requester: {
//           select: {
//             id: true,
//             name: true,
//           },
//         },
//         manager: {
//           select: {
//             id: true,
//             name: true,
//           },
//         },
//       },
//     });

//     console.log(`Found ${allMaintenanceRecords.length} maintenance records`);

//     if (allMaintenanceRecords.length === 0) {
//       return Response.json({
//         stats: {
//           totalRequests: 0,
//           pendingRequests: 0,
//           avgResolutionDays: 0,
//           completionRate: 0,
//           requestGrowth: 0,
//           totalCost: 0,
//           avgCostPerRequest: 0,
//         },
//         statusDistribution: [],
//         priorityDistribution: [],
//         departmentDistribution: [],
//         monthlyTrends: [],
//         topAssets: [],
//         recentActivity: [],
//       });
//     }

//     // Current month's requests
//     const currentMonthRequests = allMaintenanceRecords.filter(
//       record => new Date(record.createdAt) >= new Date(now.getFullYear(), now.getMonth(), 1)
//     ).length;

//     // Last month's requests
//     const lastMonthRequests = allMaintenanceRecords.filter(
//       record => {
//         const createdAt = new Date(record.createdAt);
//         return createdAt >= new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1) &&
//                createdAt < new Date(now.getFullYear(), now.getMonth(), 1);
//       }
//     ).length;

//     // Status distribution
//     const statusMap = new Map();
//     allMaintenanceRecords.forEach(record => {
//       const status = record.status;
//       statusMap.set(status, (statusMap.get(status) || 0) + 1);
//     });

//     const statusDistribution = Array.from(statusMap.entries()).map(([status, count]) => ({
//       status: status.replace('_', ' '),
//       count,
//     }));

//     // Priority distribution
//     const priorityMap = new Map();
//     allMaintenanceRecords.forEach(record => {
//       const priority = record.priority;
//       priorityMap.set(priority, (priorityMap.get(priority) || 0) + 1);
//     });

//     const priorityDistribution = Array.from(priorityMap.entries()).map(([priority, count]) => ({
//       priority,
//       count,
//     }));

//     // Monthly trends
//     const monthlyMap = new Map();
//     allMaintenanceRecords.forEach(record => {
//       const date = new Date(record.createdAt);
//       const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

//       if (!monthlyMap.has(monthKey)) {
//         monthlyMap.set(monthKey, {
//           count: 0,
//           completed: 0,
//           highPriority: 0,
//           totalCost: 0,
//         });
//       }

//       const monthData = monthlyMap.get(monthKey);
//       monthData.count++;

//       if (record.status === 'COMPLETED') {
//         monthData.completed++;
//       }

//       if (record.priority === 'HIGH' || record.priority === 'CRITICAL') {
//         monthData.highPriority++;
//       }

//       if (record.cost) {
//         monthData.totalCost += record.cost;
//       }
//     });

//     // Sort monthly trends by date
//     const monthlyTrends = Array.from(monthlyMap.entries())
//       .map(([month, data]) => ({
//         month,
//         ...data,
//       }))
//       .sort((a, b) => a.month.localeCompare(b.month));

//     // Top assets requiring maintenance
//     const assetMaintenanceMap = new Map();

//     allMaintenanceRecords.forEach(record => {
//       if (!record.asset) return;

//       const assetId = record.asset.id;
//       if (!assetMaintenanceMap.has(assetId)) {
//         assetMaintenanceMap.set(assetId, {
//           id: assetId,
//           name: record.asset.name,
//           serialNumber: record.asset.serialNumber,
//           department: record.asset.department,
//           category: record.asset.category,
//           lastMaintenance: record.asset.lastMaintenance,
//           nextMaintenance: record.asset.nextMaintenance,
//           totalRequests: 0,
//           totalCost: 0,
//           criticalRequests: 0,
//           requests: [],
//         });
//       }

//       const assetData = assetMaintenanceMap.get(assetId);
//       assetData.totalRequests++;

//       if (record.cost) {
//         assetData.totalCost += record.cost;
//       }

//       if (record.priority === 'CRITICAL') {
//         assetData.criticalRequests++;
//       }

//       assetData.requests.push(record);
//     });

//     // Calculate average cost and sort by total requests
//     const topAssets = Array.from(assetMaintenanceMap.values())
//       .map(asset => ({
//         ...asset,
//         averageCost: asset.requests.length > 0 ? asset.totalCost / asset.requests.length : 0,
//         status: asset.nextMaintenance && new Date(asset.nextMaintenance) <= now ? 'Due' : 'OK',
//       }))
//       .sort((a, b) => b.totalRequests - a.totalRequests)
//       .slice(0, 10);

//     // Recent activity
//     const recentMaintenanceRequests = allMaintenanceRecords
//       .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
//       .slice(0, 15)
//       .map(record => ({
//         ...record,
//         timeAgo: getTimeAgo(new Date(record.createdAt)),
//       }));

//     // Calculate request growth
//     const requestGrowth =
//       lastMonthRequests > 0
//         ? ((currentMonthRequests - lastMonthRequests) / lastMonthRequests) * 100
//         : 0;

//     // Department distribution
//     const departmentMap = new Map();

//     allMaintenanceRecords.forEach(record => {
//       if (!record.asset || !record.asset.department) return;

//       const department = record.asset.department;
//       if (!departmentMap.has(department)) {
//         departmentMap.set(department, {
//           department,
//           count: 0,
//           totalCost: 0,
//           criticalCount: 0,
//           highCount: 0,
//           mediumCount: 0,
//           lowCount: 0,
//         });
//       }

//       const deptData = departmentMap.get(department);
//       deptData.count++;

//       if (record.cost) {
//         deptData.totalCost += record.cost;
//       }

//       if (record.priority === 'CRITICAL') {
//         deptData.criticalCount++;
//       } else if (record.priority === 'HIGH') {
//         deptData.highCount++;
//       } else if (record.priority === 'MEDIUM') {
//         deptData.mediumCount++;
//       } else if (record.priority === 'LOW') {
//         deptData.lowCount++;
//       }
//     });

//     const departmentDistribution = Array.from(departmentMap.values());

//     // Calculate average resolution time
//     const completedRequests = allMaintenanceRecords.filter(
//       record => record.status === 'COMPLETED' && record.scheduledDate && record.completedAt
//     );

//     const avgResolutionDays = completedRequests.length > 0
//       ? completedRequests.reduce((sum, request) => {
//           try {
//             const scheduledDate = new Date(request.scheduledDate!);
//             const completedDate = new Date(request.completedAt!);
//             const duration = Math.max(0, completedDate.getTime() - scheduledDate.getTime());
//             return sum + (duration / (1000 * 60 * 60 * 24)); // Convert to days
//           } catch {
//             return sum;
//           }
//         }, 0) / completedRequests.length
//       : 0;

//     // Calculate completion rate
//     const totalRequests = allMaintenanceRecords.length;
//     const completedCount = allMaintenanceRecords.filter(record => record.status === 'COMPLETED').length;
//     const pendingApprovalCount = allMaintenanceRecords.filter(record => record.status === 'PENDING_APPROVAL').length;
//     const scheduledCount = allMaintenanceRecords.filter(record => record.status === 'SCHEDULED').length;
//     const completionRate = totalRequests > 0 ? (completedCount / totalRequests) * 100 : 0;

//     // Calculate total maintenance cost
//     const totalMaintenanceCost = allMaintenanceRecords.reduce((sum, record) => sum + (record.cost || 0), 0);

//     // Calculate average cost per request
//     const avgCostPerRequest = totalRequests > 0 ? totalMaintenanceCost / totalRequests : 0;

//     // Calculate high priority percentage
//     const highPriorityCount = allMaintenanceRecords.filter(
//       record => record.priority === 'HIGH' || record.priority === 'CRITICAL'
//     ).length;
//     const highPriorityPercentage = totalRequests > 0 ? (highPriorityCount / totalRequests) * 100 : 0;

//     // Calculate average time to approval
//     const approvedRequests = allMaintenanceRecords.filter(
//       record => (record.status === 'APPROVED' || record.status === 'COMPLETED') && record.createdAt && record.updatedAt
//     );

//     const avgTimeToApproval = approvedRequests.length > 0
//       ? approvedRequests.reduce((sum, record) => {
//           try {
//             const createdDate = new Date(record.createdAt);
//             const updatedDate = new Date(record.updatedAt);
//             const timeDiff = Math.max(0, updatedDate.getTime() - createdDate.getTime());
//             return sum + (timeDiff / (1000 * 60 * 60 * 24));
//           } catch {
//             return sum;
//           }
//         }, 0) / approvedRequests.length
//       : 0;

//     // Calculate maintenance efficiency (completed vs scheduled)
//     const maintenanceEfficiency = (scheduledCount + completedCount) > 0
//       ? (completedCount / (scheduledCount + completedCount)) * 100
//       : completedCount > 0 ? 100 : 0;

//     // Calculate cost efficiency (average cost per completed maintenance)
//     const completedCosts = completedRequests.reduce((sum, record) => sum + (record.cost || 0), 0);
//     const costEfficiency = completedCount > 0 ? completedCosts / completedCount : 0;

//     // Format monthly trends for better readability
//     const formattedMonthlyTrends = monthlyTrends.map(item => {
//       try {
//         const [year, monthNum] = item.month.split('-');
//         const monthName = new Date(parseInt(year), parseInt(monthNum) - 1, 1)
//           .toLocaleDateString('en-US', { month: 'short' });

//         return {
//           ...item,
//           monthDisplay: `${monthName} ${year}`,
//           completionRate: item.count > 0 ? (item.completed / item.count) * 100 : 0,
//           avgCost: item.count > 0 ? item.totalCost / item.count : 0,
//         };
//       } catch {
//         return {
//           ...item,
//           monthDisplay: item.month,
//           completionRate: 0,
//           avgCost: 0,
//         };
//       }
//     });

//     console.log("Returning maintenance report data");

//     return Response.json({
//       stats: {
//         totalRequests,
//         pendingRequests: pendingApprovalCount,
//         avgResolutionDays: Math.round(avgResolutionDays * 10) / 10,
//         completionRate: Math.round(completionRate),
//         requestGrowth: Math.round(requestGrowth * 10) / 10,
//         totalCost: totalMaintenanceCost,
//         avgCostPerRequest: Math.round(avgCostPerRequest * 100) / 100,
//         highPriorityPercentage: Math.round(highPriorityPercentage),
//         avgTimeToApproval: Math.round(avgTimeToApproval * 10) / 10,
//         maintenanceEfficiency: Math.round(maintenanceEfficiency),
//         costEfficiency: Math.round(costEfficiency * 100) / 100,
//       },
//       statusDistribution,
//       priorityDistribution,
//       departmentDistribution,
//       monthlyTrends: formattedMonthlyTrends,
//       topAssets,
//       recentActivity: recentMaintenanceRequests,
//     });
//   } catch (error) {
//     console.error('Error:', error);
//     return Response.json(
//       { error: 'Failed to generate maintenance reports' },
//       { status: 500 }
//     );
//   }
// }
