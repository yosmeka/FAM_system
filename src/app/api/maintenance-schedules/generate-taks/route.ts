// import { NextRequest } from 'next/server';
// import { getServerSession } from 'next-auth';
// import { authOptions } from '@/lib/auth';
// import { prisma } from '@/lib/prisma';

// // POST /api/maintenance-schedules/generate-tasks - Generate maintenance tasks from schedules
// export async function POST(request: NextRequest) {
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session?.user?.id) {
//       return Response.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     // Only managers and admins can generate tasks
//     if (session.user.role !== 'MANAGER' && session.user.role !== 'ADMIN') {
//       return Response.json({ error: 'Access denied' }, { status: 403 });
//     }

//     const { scheduleId, forceGenerate } = await request.json();

//     console.log('Task generation request:', { scheduleId, forceGenerate });

//     let schedules;

//     if (scheduleId) {
//       // Generate tasks for specific schedule
//       schedules = await prisma.maintenanceSchedule.findMany({
//         where: {
//           id: scheduleId,
//           status: 'ACTIVE',
//         },
//         include: {
//           asset: true,
//           template: true,
//           assignedTo: true,
//         },
//       });
//     } else {
//       // Generate tasks for all due schedules
//       const now = new Date();
//       const leadTime = new Date();
//       leadTime.setDate(now.getDate() + 7); // Default 7 days lead time

//       // Build the where clause based on forceGenerate
//       const whereClause: Record<string, unknown> = {
//         status: 'ACTIVE',
//       };

//       if (!forceGenerate) {
//         // Only include schedules due within lead time if not force generating
//         whereClause.nextDue = {
//           lte: leadTime,
//         };
//       }

//       console.log('Where clause for schedule selection:', JSON.stringify(whereClause, null, 2));

//       schedules = await prisma.maintenanceSchedule.findMany({
//         where: whereClause,
//         include: {
//           asset: true,
//           template: true,
//           assignedTo: true,
//         },
//       });
//     }

//     console.log(`Found ${schedules.length} schedules for task generation`);
//     schedules.forEach(schedule => {
//       console.log(`Schedule: ${schedule.title}, Next Due: ${schedule.nextDue}, Status: ${schedule.status}`);
//     });

//     const generatedTasks = [];
//     const errors = [];

//     for (const schedule of schedules) {
//       try {
//         // Check if task already exists for this schedule and due date
//         const existingTask = await prisma.maintenance.findFirst({
//           where: {
//             scheduleId: schedule.id,
//             scheduledDate: {
//               gte: new Date(schedule.nextDue!.getTime() - 24 * 60 * 60 * 1000), // 1 day before
//               lte: new Date(schedule.nextDue!.getTime() + 24 * 60 * 60 * 1000), // 1 day after
//             },
//             status: {
//               not: 'CANCELLED',
//             },
//           },
//         });

//         if (existingTask && !forceGenerate) {
//           console.log(`Skipping schedule ${schedule.id} - task already exists`);
//           continue; // Skip if task already exists
//         }

//         console.log(`Generating task for schedule: ${schedule.title} (ID: ${schedule.id})`);
//         console.log(`Assigned to: ${schedule.assignedTo?.name || 'Unassigned'} (ID: ${schedule.assignedToId})`);
//         console.log(`Auto-assign: ${schedule.autoAssign}`);

//         // Generate checklist items from template if available
//         let checklistItems = null;
//         if (schedule.template?.checklistItems) {
//           try {
//             const templateChecklist = JSON.parse(schedule.template.checklistItems);
//             checklistItems = JSON.stringify(
//               templateChecklist.map((item: Record<string, unknown>) => ({
//                 ...item,
//                 completed: false,
//                 completedAt: null,
//                 notes: '',
//               }))
//             );
//           } catch (e) {
//             console.warn('Failed to parse template checklist:', e);
//           }
//         }

//         // Create maintenance task
//         const task = await prisma.maintenance.create({
//           data: {
//             assetId: schedule.assetId,
//             description: schedule.description || `Scheduled maintenance: ${schedule.title}`,
//             priority: schedule.priority,
//             maintenanceType: schedule.template?.maintenanceType || 'PREVENTIVE',
//             status: schedule.autoAssign && schedule.assignedToId ? 'SCHEDULED' : 'PENDING_APPROVAL',
//             scheduledDate: schedule.nextDue,
//             estimatedHours: schedule.estimatedHours || schedule.template?.estimatedHours,
//             scheduleId: schedule.id,
//             templateId: schedule.templateId,
//             requesterId: schedule.createdById, // Manager who created the schedule
//             managerId: schedule.createdById, // Auto-approve since it's scheduled
//             assignedToId: schedule.autoAssign ? schedule.assignedToId : null,
//             checklistItems,
//             notes: schedule.template?.instructions || null,
//           },
//           include: {
//             asset: {
//               select: {
//                 id: true,
//                 name: true,
//                 serialNumber: true,
//                 location: true,
//               },
//             },
//             assignedTo: {
//               select: {
//                 id: true,
//                 name: true,
//                 email: true,
//               },
//             },
//           },
//         });

//         // Calculate next due date
//         const nextDue = calculateNextDueDate(
//           schedule.nextDue!,
//           schedule.frequency,
//           schedule.customInterval ?? undefined
//         );

//         // Update schedule with new next due date and last generated timestamp
//         await prisma.maintenanceSchedule.update({
//           where: { id: schedule.id },
//           data: {
//             nextDue,
//             lastGenerated: new Date(),
//           },
//         });

//         generatedTasks.push(task);

//         // TODO: Send notification to assigned user if auto-assigned
//         if (schedule.autoAssign && schedule.assignedToId) {
//           // Notification logic would go here
//         }

//       } catch (error) {
//         console.error(`Error generating task for schedule ${schedule.id}:`, error);
//         errors.push({
//           scheduleId: schedule.id,
//           error: error instanceof Error ? error.message : 'Unknown error',
//         });
//       }
//     }

//     return Response.json({
//       success: true,
//       generatedTasks: generatedTasks.length,
//       tasks: generatedTasks,
//       errors: errors.length > 0 ? errors : undefined,
//     });

//   } catch (error) {
//     console.error('Error generating maintenance tasks:', error);
//     return Response.json(
//       { error: 'Failed to generate maintenance tasks' },
//       { status: 500 }
//     );
//   }
// }

// // Helper function to calculate next due date
// function calculateNextDueDate(currentDue: Date, frequency: string, customInterval?: number): Date {
//   const nextDue = new Date(currentDue);

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
//       if (customInterval ?? undefined) {
//         nextDue.setDate(nextDue.getDate() + (customInterval ?? 0));
//       }
//       break;
//     default:
//       nextDue.setMonth(nextDue.getMonth() + 1); // Default to monthly
//   }

//   return nextDue;
// }