// import { NextRequest, NextResponse } from 'next/server';
// import { getServerSession } from 'next-auth';
// import { authOptions } from '@/lib/auth';
// import { prisma } from '@/lib/prisma';
// import { withRole } from '@/middleware/rbac';

// // GET /api/maintenance-schedules - Get all maintenance schedules
// export const GET = withRole(['MANAGER', 'USER'], async function GET(request: NextRequest) {
//   try {
//     const session = await getServerSession(authOptions);

//     const { searchParams } = new URL(request.url);
//     const assetId = searchParams.get('assetId');
//     const status = searchParams.get('status');
//     const assignedToId = searchParams.get('assignedToId');

//     const where: any = {};

//     // Filter by asset if specified
//     if (assetId) {
//       where.assetId = assetId;
//     }

//     // Filter by status if specified
//     if (status) {
//       where.status = status;
//     }

//     // Filter by assigned user if specified
//     if (assignedToId) {
//       where.assignedToId = assignedToId;
//     }

//     // Role-based filtering
//     if (session.user.role === 'USER') {
//       // Users can only see schedules assigned to them or created by their managers
//       where.OR = [
//         { assignedToId: session.user.id },
//         { createdById: session.user.id }, // In case user is also a manager
//       ];
//     }

//     const schedules = await prisma.maintenanceSchedule.findMany({
//       where,
//       include: {
//         asset: {
//           select: {
//             id: true,
//             name: true,
//             serialNumber: true,
//             location: true,
//           },
//         },
//         createdBy: {
//           select: {
//             id: true,
//             name: true,
//             email: true,
//           },
//         },
//         assignedTo: {
//           select: {
//             id: true,
//             name: true,
//             email: true,
//           },
//         },
//         template: {
//           select: {
//             id: true,
//             name: true,
//             maintenanceType: true,
//           },
//         },
//         maintenanceTasks: {
//           select: {
//             id: true,
//             status: true,
//             scheduledDate: true,
//             completedAt: true,
//           },
//           orderBy: {
//             scheduledDate: 'desc',
//           },
//           take: 5, // Last 5 maintenance tasks
//         },
//       },
//       orderBy: {
//         nextDue: 'asc',
//       },
//     });

//     return NextResponse.json(schedules);
//   } catch (error) {
//     console.error('Error fetching maintenance schedules:', error);
//     return NextResponse.json(
//       { error: 'Failed to fetch maintenance schedules' },
//       { status: 500 }
//     );
//   }
// });

// // POST /api/maintenance-schedules - Create new maintenance schedule
// export const POST = withRole(['MANAGER', 'ADMIN'], async function POST(request: NextRequest) {
//   try {
//     const session = await getServerSession(authOptions);

//     const data = await request.json();
//     const {
//       assetId,
//       title,
//       description,
//       frequency,
//       customInterval,
//       priority,
//       estimatedHours,
//       assignedToId,
//       templateId,
//       startDate,
//       endDate,
//       leadTimeDays,
//       autoAssign,
//     } = data;

//     // Validate required fields
//     if (!assetId || !title || !frequency || !startDate) {
//       return NextResponse.json(
//         { error: 'Missing required fields' },
//         { status: 400 }
//       );
//     }

//     // Validate asset exists
//     const asset = await prisma.asset.findUnique({
//       where: { id: assetId },
//     });

//     if (!asset) {
//       return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
//     }

//     // Calculate next due date based on frequency
//     const nextDue = calculateNextDueDate(new Date(startDate), frequency, customInterval);

//     const schedule = await prisma.maintenanceSchedule.create({
//       data: {
//         assetId,
//         title,
//         description,
//         frequency,
//         customInterval: frequency === 'CUSTOM' ? customInterval : null,
//         priority: priority || 'MEDIUM',
//         estimatedHours,
//         createdById: session.user.id,
//         assignedToId,
//         templateId,
//         startDate: new Date(startDate),
//         endDate: endDate ? new Date(endDate) : null,
//         nextDue,
//         leadTimeDays: leadTimeDays || 7,
//         autoAssign: autoAssign !== false, // Default to true
//       },
//       include: {
//         asset: {
//           select: {
//             id: true,
//             name: true,
//             serialNumber: true,
//             location: true,
//           },
//         },
//         createdBy: {
//           select: {
//             id: true,
//             name: true,
//             email: true,
//           },
//         },
//         assignedTo: {
//           select: {
//             id: true,
//             name: true,
//             email: true,
//           },
//         },
//         template: {
//           select: {
//             id: true,
//             name: true,
//             maintenanceType: true,
//           },
//         },
//       },
//     });

//     return NextResponse.json(schedule, { status: 201 });
//   } catch (error) {
//     console.error('Error creating maintenance schedule:', error);
//     return NextResponse.json(
//       { error: 'Failed to create maintenance schedule' },
//       { status: 500 }
//     );
//   }
// });

// // Helper function to calculate next due date
// function calculateNextDueDate(startDate: Date, frequency: string, customInterval?: number): Date {
//   const nextDue = new Date(startDate);

//   switch (frequency) {
//     case 'DAILY':
//       nextDue.setDate(nextDue.getDate() + 1);
//       break;
//     case 'WEEKLY':
//       nextDue.setDate(nextDue.getDate() + 7);
//       break;
//     case 'MONTHLY':
//       nextDue.setMonth(nextDue.getMonth() + 1);
//       break;
//     case 'QUARTERLY':
//       nextDue.setMonth(nextDue.getMonth() + 3);
//       break;
//     case 'SEMI_ANNUALLY':
//       nextDue.setMonth(nextDue.getMonth() + 6);
//       break;
//     case 'ANNUALLY':
//       nextDue.setFullYear(nextDue.getFullYear() + 1);
//       break;
//     case 'CUSTOM':
//       if (customInterval) {
//         nextDue.setDate(nextDue.getDate() + customInterval);
//       }
//       break;
//     default:
//       nextDue.setMonth(nextDue.getMonth() + 1); // Default to monthly
//   }

//   return nextDue;
// }
