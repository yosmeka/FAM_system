// import { getServerSession } from 'next-auth';
// import { authOptions } from '@/lib/auth';
// import { prisma } from '@/lib/prisma';

// // GET a specific maintenance record
// export async function GET(
//   request: Request,
//   { params }: { params: Promise<{ id: string; maintenanceId: string }> }
// ) {
//   try {
//     const { id, maintenanceId } = await params;

//     // Get session for authentication
//     const session = await getServerSession(authOptions);

//     // For testing, we'll allow requests without a session
//     if (!session) {
//       console.log("MAINTENANCE RECORD API - No session found, but continuing for testing");
//     } else {
//       console.log("MAINTENANCE RECORD API - Authorized user:", session.user?.email);
//     }

//     // Check if the maintenance record exists
//     const maintenance = await prisma.maintenance.findUnique({
//       where: {
//         id: maintenanceId,
//         assetId: id,
//       },
//       include: {
//         requester: {
//           select: {
//             name: true,
//             email: true,
//           },
//         },
//       },
//     });

//     if (!maintenance) {
//       return Response.json({ error: 'Maintenance record not found' }, { status: 404 });
//     }

//     return Response.json(maintenance);
//   } catch (error) {
//     console.error('Error fetching maintenance record:', error);
//     return Response.json(
//       { error: 'Failed to fetch maintenance record' },
//       { status: 500 }
//     );
//   }
// }

// // PUT (update) a specific maintenance record
// export async function PUT(
//   request: Request,
//   { params }: { params: Promise<{ id: string; maintenanceId: string }> }
// ) {
//   try {
//     const { id, maintenanceId } = await params;

//     // Get session for authentication
//     const session = await getServerSession(authOptions);

//     // For testing, we'll allow requests without a session
//     if (!session) {
//       console.log("MAINTENANCE RECORD PUT API - No session found, but continuing for testing");
//     } else {
//       console.log("MAINTENANCE RECORD PUT API - Authorized user:", session.user?.email);
//     }

//     // Check if the maintenance record exists with all related data
//     const existingMaintenance = await prisma.maintenance.findUnique({
//       where: {
//         id: maintenanceId,
//         assetId: id,
//       },
//       include: {
//         asset: {
//           select: {
//             name: true,
//             serialNumber: true,
//           },
//         },
//         requester: {
//           select: {
//             id: true,
//             name: true,
//             email: true,
//           },
//         },
//         manager: {
//           select: {
//             id: true,
//             name: true,
//             email: true,
//           },
//         },
//       },
//     });

//     if (!existingMaintenance) {
//       return Response.json({ error: 'Maintenance record not found' }, { status: 404 });
//     }

//     // Get the asset
//     const asset = await prisma.asset.findUnique({
//       where: {
//         id,
//       },
//     });

//     if (!asset) {
//       return Response.json({ error: 'Asset not found' }, { status: 404 });
//     }

//     // Parse the request body
//     const body = await request.json();

//     // Extract notification flags
//     const { notifyManager, previousStatus } = body;

//     // Prepare update data
//     const updateData: any = {
//       description: body.description,
//       priority: body.priority,
//       status: body.status,
//       cost: body.cost,
//     };

//     // Handle completion date if status is COMPLETED
//     const wasCompleted = existingMaintenance.status === 'COMPLETED';
//     const isNowCompleted = body.status === 'COMPLETED';

//     if (isNowCompleted) {
//       updateData.completedAt = body.completedDate ? new Date(body.completedDate) : new Date();
//     }

//     // Update the maintenance record
//     const updatedMaintenance = await prisma.maintenance.update({
//       where: {
//         id: maintenanceId,
//       },
//       data: updateData,
//       include: {
//         asset: {
//           select: {
//             name: true,
//             serialNumber: true,
//           },
//         },
//         requester: {
//           select: {
//             id: true,
//             name: true,
//             email: true,
//           },
//         },
//         manager: {
//           select: {
//             id: true,
//             name: true,
//             email: true,
//           },
//         },
//       },
//     });

//     // If the status changed to COMPLETED, update the asset's maintenance dates
//     if (!wasCompleted && isNowCompleted) {
//       const completionDate = updateData.completedAt;

//       // Calculate next maintenance date (3 months from completion by default)
//       const nextMaintenanceDate = new Date(completionDate);
//       nextMaintenanceDate.setMonth(nextMaintenanceDate.getMonth() + 3);

//       await prisma.asset.update({
//         where: {
//           id,
//         },
//         data: {
//           lastMaintenance: completionDate,
//           nextMaintenance: nextMaintenanceDate,
//         },
//       });

//       // Create asset history records
//       await prisma.assetHistory.createMany({
//         data: [
//           {
//             assetId: id,
//             field: 'lastMaintenance',
//             oldValue: asset.lastMaintenance ? asset.lastMaintenance.toISOString() : null,
//             newValue: completionDate.toISOString(),
//             changedBy: session.user?.email || 'system',
//           },
//           {
//             assetId: id,
//             field: 'nextMaintenance',
//             oldValue: asset.nextMaintenance ? asset.nextMaintenance.toISOString() : null,
//             newValue: nextMaintenanceDate.toISOString(),
//             changedBy: session.user?.email || 'system',
//           },
//         ],
//       });
//     }

//     // Send notification to manager if requested
//     if (notifyManager && updatedMaintenance.manager && previousStatus) {
//       try {
//         // Import the sendNotification function
//         const { sendNotification } = await import('@/lib/notifications');

//         // Create a user-friendly status name
//         const getStatusName = (status: string) => {
//           const statusMap: Record<string, string> = {
//             'PENDING_APPROVAL': 'Pending Approval',
//             'APPROVED': 'Approved',
//             'REJECTED': 'Rejected',
//             'SCHEDULED': 'Scheduled',
//             'IN_PROGRESS': 'In Progress',
//             'COMPLETED': 'Completed',
//             'CANCELLED': 'Cancelled'
//           };
//           return statusMap[status] || status;
//         };

//         // Get user-friendly status names
//         const oldStatusName = getStatusName(previousStatus);
//         const newStatusName = getStatusName(body.status);

//         // Create the notification message
//         const message = `Maintenance request for asset "${updatedMaintenance.asset.name}" has been updated from "${oldStatusName}" to "${newStatusName}" by ${updatedMaintenance.requester.name}.`;

//         // Send the notification to the manager
//         await sendNotification({
//           userId: updatedMaintenance.manager.id,
//           message,
//           type: 'maintenance_status_changed',
//           meta: {
//             assetId: updatedMaintenance.assetId,
//             maintenanceId: updatedMaintenance.id,
//             previousStatus,
//             newStatus: body.status,
//             updatedBy: updatedMaintenance.requester.id
//           },
//         });

//         console.log(`Sent status change notification to manager ${updatedMaintenance.manager.id}`);
//       } catch (notificationError) {
//         console.error('Error sending notification to manager:', notificationError);
//         // Continue even if notification fails
//       }
//     }

//     return Response.json(updatedMaintenance);
//   } catch (error) {
//     console.error('Error updating maintenance record:', error);
//     return Response.json(
//       { error: 'Failed to update maintenance record' },
//       { status: 500 }
//     );
//   }
// }

// // DELETE a specific maintenance record
// export async function DELETE(
//   request: Request,
//   { params }: { params: Promise<{ id: string; maintenanceId: string }> }
// ) {
//   try {
//     const { id, maintenanceId } = await params;

//     // Get session for authentication
//     const session = await getServerSession(authOptions);

//     // For testing, we'll allow requests without a session
//     if (!session) {
//       console.log("MAINTENANCE RECORD DELETE API - No session found, but continuing for testing");
//     } else {
//       console.log("MAINTENANCE RECORD DELETE API - Authorized user:", session.user?.email);
//     }

//     // Check if the maintenance record exists
//     const maintenance = await prisma.maintenance.findUnique({
//       where: {
//         id: maintenanceId,
//         assetId: id,
//       },
//     });

//     if (!maintenance) {
//       return Response.json({ error: 'Maintenance record not found' }, { status: 404 });
//     }

//     // Delete the maintenance record
//     await prisma.maintenance.delete({
//       where: {
//         id: maintenanceId,
//       },
//     });

//     return Response.json({ success: true });
//   } catch (error) {
//     console.error('Error deleting maintenance record:', error);
//     return Response.json(
//       { error: 'Failed to delete maintenance record' },
//       { status: 500 }
//     );
//   }
// }
