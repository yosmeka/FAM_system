// import { prisma } from '@/lib/prisma';
// import { getServerSession } from 'next-auth';
// import { authOptions } from '@/lib/auth';

// // GET /api/maintenance/[id]
// export async function GET(
//   request: Request,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   try {
//     const { id } = await params;
//     const maintenanceRequest = await prisma.maintenance.findUnique({
//       where: { id },
//       include: {
//         asset: {
//           select: {
//             id: true,
//             name: true,
//             serialNumber: true,
//             location: true,
//           },
//         },
//         requester: {
//           select: {
//             name: true,
//             email: true,
//           },
//         },
//         manager: {
//           select: {
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
//         schedule: {
//           include: {
//             template: {
//               select: {
//                 id: true,
//                 name: true,
//                 description: true,
//                 instructions: true,
//                 safetyNotes: true,
//                 toolsRequired: true,
//                 partsRequired: true,
//                 checklistItems: true,
//               },
//             },
//           },
//         },
//       },
//     });

//     if (!maintenanceRequest) {
//       return Response.json(
//         { error: 'Maintenance request not found' },
//         { status: 404 }
//       );
//     }

//     // Check for associated document if the request is approved or rejected
//     let documentUrl = null;
//     if (maintenanceRequest.status === 'APPROVED' || maintenanceRequest.status === 'REJECTED') {
//       try {
//         // Find documents for this maintenance request
//         const documents = await prisma.document.findMany({
//           where: {
//             assetId: maintenanceRequest.assetId,
//           },
//         });
//         // Find the document related to this maintenance request
//         const maintenanceDocument = documents.find(
//           (doc) =>
//             doc.meta &&
//             typeof doc.meta === 'object' &&
//             'maintenanceId' in doc.meta &&
//             doc.meta.maintenanceId === id
//         );
//         if (maintenanceDocument) {
//           documentUrl = maintenanceDocument.url;
//         } else {
//           // Try a different approach - look for documents by type
//           const typeDocument = documents.find(
//             (doc) =>
//               (doc.type === 'MAINTENANCE_APPROVAL' || doc.type === 'MAINTENANCE_REJECTION') &&
//               doc.meta &&
//               typeof doc.meta === 'object'
//           );
//           if (typeDocument) {
//             documentUrl = typeDocument.url;
//           }
//         }
//       } catch (error) {
//         console.error(`Error fetching document for maintenance ${id}:`, error);
//       }
//     }

//     // Parse template JSON strings if template exists
//     const processedRequest = { ...maintenanceRequest, documentUrl };

//     if (processedRequest.schedule?.template) {
//       const safeParseJSON = (jsonString: string | null): unknown[] => {
//         if (!jsonString) return [];
//         try {
//           const parsed = JSON.parse(jsonString);
//           return Array.isArray(parsed) ? parsed : [];
//         } catch (error) {
//           console.error('Error parsing template JSON:', error);
//           return [];
//         }
//       };

//       processedRequest.schedule.template = {
//         ...processedRequest.schedule.template,
//         toolsRequired: safeParseJSON(processedRequest.schedule.template.toolsRequired as string),
//         partsRequired: safeParseJSON(processedRequest.schedule.template.partsRequired as string),
//         checklistItems: safeParseJSON(processedRequest.schedule.template.checklistItems as string),
//       } as typeof processedRequest.schedule.template & {
//         toolsRequired: unknown[];
//         partsRequired: unknown[];
//         checklistItems: unknown[];
//       };
//     }

//     return Response.json(processedRequest);
//   } catch (error) {
//     console.error('Error:', error);
//     return Response.json(
//       { error: 'Failed to fetch maintenance request' },
//       { status: 500 }
//     );
//   }
// }

// // PUT /api/maintenance/[id]
// export async function PUT(
//   request: Request,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   try {
//     const { id } = await params;
//     const body = await request.json();
//     const {
//       status,
//       description,
//       priority,
//       notes,
//       scheduledDate,
//       managerId,
//       notifyManager,
//       previousStatus,
//       actualHours,
//       checklistItems,
//       completedAt,
//       // Work documentation fields
//       workPerformed,
//       partsUsed,
//       laborHours,
//       partsCost,
//       laborCost,
//       totalCost,
//       workStartedAt,
//       workCompletedAt,
//       technicianNotes,
//       managerReviewNotes,
//       finalApprovedAt,
//       finalApprovedBy,
//       assignedToId
//     } = body;

//     // Get the current maintenance request to check its status and requester
//     const currentRequest = await prisma.maintenance.findUnique({
//       where: { id },
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
//         }
//       }
//     });

//     if (!currentRequest) {
//       return Response.json(
//         { error: 'Maintenance request not found' },
//         { status: 404 }
//       );
//     }

//     // Get the current session to check user role
//     const session = await getServerSession();
//     const userId = session?.user?.id;
//     const userRole = session?.user?.role;

//     // Check user permissions
//     const isRequester = userId === currentRequest.requesterId;
//     const isAssignedTechnician = userId === currentRequest.assignedToId;
//     const isPendingApproval = currentRequest.status === 'PENDING_APPROVAL';

//     // Authorization logic
//     if (userRole === 'USER') {
//       // Regular users (technicians) can only update tasks assigned to them
//       if (!isAssignedTechnician && !isRequester) {
//         return Response.json(
//           { error: 'You can only update tasks assigned to you' },
//           { status: 403 }
//         );
//       }

//       // Requesters cannot change status of pending requests
//       if (isRequester && isPendingApproval && status !== undefined && status !== 'PENDING_APPROVAL') {
//         return Response.json(
//           { error: 'Regular users cannot change the status of a pending request' },
//           { status: 403 }
//         );
//       }
//     }

//     // Build the update data object
//     const updateData: Record<string, unknown> = {};

//     // Only update fields that are provided
//     if (description !== undefined) updateData.description = description;
//     if (priority !== undefined) updateData.priority = priority;
//     if (notes !== undefined) updateData.notes = notes;
//     if (scheduledDate !== undefined) updateData.scheduledDate = new Date(scheduledDate);
//     if (managerId !== undefined) updateData.managerId = managerId || null; // Allow unsetting manager with empty string
//     if (actualHours !== undefined) updateData.actualHours = actualHours;
//     if (Array.isArray(checklistItems)) updateData.checklistItems = JSON.stringify(checklistItems);
//     if (assignedToId !== undefined) updateData.assignedToId = assignedToId;

//     // Work documentation fields
//     if (workPerformed !== undefined) updateData.workPerformed = workPerformed;
//     if (Array.isArray(partsUsed)) updateData.partsUsed = JSON.stringify(partsUsed);
//     if (laborHours !== undefined) updateData.laborHours = laborHours;
//     if (partsCost !== undefined) updateData.partsCost = partsCost;
//     if (laborCost !== undefined) updateData.laborCost = laborCost;
//     if (totalCost !== undefined) updateData.totalCost = totalCost;
//     if (workStartedAt !== undefined) updateData.workStartedAt = workStartedAt ? new Date(workStartedAt) : null;
//     if (workCompletedAt !== undefined) updateData.workCompletedAt = workCompletedAt ? new Date(workCompletedAt) : null;
//     if (technicianNotes !== undefined) updateData.technicianNotes = technicianNotes;
//     if (managerReviewNotes !== undefined) updateData.managerReviewNotes = managerReviewNotes;
//     if (finalApprovedAt !== undefined) updateData.finalApprovedAt = finalApprovedAt ? new Date(finalApprovedAt) : null;
//     if (finalApprovedBy !== undefined) updateData.finalApprovedBy = finalApprovedBy;

//     // Handle status changes
//     if (status !== undefined) {
//       updateData.status = status;

//       // Set completedAt when status changes to COMPLETED or if explicitly provided
//       if (status === 'COMPLETED' || completedAt !== undefined) {
//         updateData.completedAt = completedAt ? new Date(completedAt) : new Date();
//       }
//     }

//     const maintenanceRequest = await prisma.maintenance.update({
//       where: { id },
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
//             name: true,
//             email: true,
//             id: true,
//           },
//         },
//         manager: {
//           select: {
//             name: true,
//             email: true,
//             id: true,
//           },
//         },
//       },
//     });

//     // If the maintenance is completed, update the asset's lastMaintenance and nextMaintenance dates
//     if (status === 'COMPLETED') {
//       const nextMaintenanceDate = new Date();
//       nextMaintenanceDate.setMonth(nextMaintenanceDate.getMonth() + 3); // Schedule next maintenance in 3 months

//       await prisma.asset.update({
//         where: { id: maintenanceRequest.assetId },
//         data: {
//           lastMaintenance: new Date(),
//           nextMaintenance: nextMaintenanceDate,
//         },
//       });
//     }

//     // Send notifications to manager for workflow updates
//     if (notifyManager && status) {
//       try {
//         // Import the sendNotification function
//         const { sendNotification } = await import('@/lib/notifications');

//         let message = '';
//         let notificationType = '';
//         let targetUserId = '';

//         // Determine notification based on status
//         if (status === 'IN_PROGRESS') {
//           // Technician started the task - notify manager
//           message = `🔧 Technician has started working on maintenance task for "${maintenanceRequest.asset.name}" (${maintenanceRequest.asset.serialNumber})`;
//           notificationType = 'maintenance_started';
//           targetUserId = maintenanceRequest.manager?.id || '';
//         } else if (status === 'PENDING_REVIEW') {
//           // Technician completed task - notify manager for review
//           message = `✅ Maintenance task for "${maintenanceRequest.asset.name}" has been completed by technician and requires your review and approval`;
//           notificationType = 'maintenance_review_required';
//           targetUserId = maintenanceRequest.manager?.id || '';
//         } else if (previousStatus === 'IN_PROGRESS' && status === 'IN_PROGRESS') {
//           // Progress update - notify manager
//           message = `📊 Progress update on maintenance task for "${maintenanceRequest.asset.name}" - technician has saved progress`;
//           notificationType = 'maintenance_progress_update';
//           targetUserId = maintenanceRequest.manager?.id || '';
//         } else if (status === 'COMPLETED') {
//           // Manager approved the task - notify technician
//           message = `✅ Your completed maintenance task for "${maintenanceRequest.asset.name}" has been approved by the manager`;
//           notificationType = 'maintenance_approved';
//           targetUserId = maintenanceRequest.assignedToId || '';
//         } else if (status === 'REJECTED') {
//           // Manager rejected the task - notify technician
//           message = `❌ Your maintenance task for "${maintenanceRequest.asset.name}" has been rejected by the manager. Please review and resubmit.`;
//           notificationType = 'maintenance_rejected';
//           targetUserId = maintenanceRequest.assignedToId || '';
//         }

//         // Send notification if we have a target user
//         if (targetUserId && message) {
//           await sendNotification({
//             userId: targetUserId,
//             message,
//             type: notificationType,
//             meta: {
//               assetId: maintenanceRequest.assetId,
//               maintenanceId: maintenanceRequest.id,
//               status: status,
//               assetName: maintenanceRequest.asset.name,
//               assetSerialNumber: maintenanceRequest.asset.serialNumber
//             },
//           });
//         }
//       } catch (notificationError) {
//         console.error('Error sending notification:', notificationError);
//         // Continue even if notification fails
//       }
//     }

//     return Response.json(maintenanceRequest);
//   } catch (error) {
//     console.error('Error:', error);
//     return Response.json(
//       { error: 'Failed to update maintenance request' },
//       { status: 500 }
//     );
//   }
// }

// // DELETE /api/maintenance/[id]
// export async function DELETE(
//   request: Request,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   try {
//     const { id } = await params;
//     // Get session for authentication
//     const session = await getServerSession(authOptions);

//     if (!session) {
//       return Response.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     // Check if the maintenance request exists
//     const maintenanceRequest = await prisma.maintenance.findUnique({
//       where: { id: id },
//       include: {
//         requester: {
//           select: {
//             id: true,
//           },
//         },
//       },
//     });

//     if (!maintenanceRequest) {
//       return Response.json({ error: 'Maintenance request not found' }, { status: 404 });
//     }

//     // Check if the user is authorized to delete this request
//     // Only the requester, managers, or admins can delete
//     const userId = session.user?.id;
//     const userRole = session.user?.role;

//     const isRequester = userId === maintenanceRequest.requester?.id;
//     const isManagerOrAdmin = userRole === 'MANAGER' || userRole === 'ADMIN';

//     if (!isRequester && !isManagerOrAdmin) {
//       return Response.json({ error: 'Not authorized to delete this maintenance request' }, { status: 403 });
//     }

//     // Delete the maintenance request
//     await prisma.maintenance.delete({
//       where: { id: id },
//     });

//     return Response.json({ success: true });
//   } catch (error) {
//     console.error('Error deleting maintenance request:', error);
//     return Response.json(
//       { error: 'Failed to delete maintenance request' },
//       { status: 500 }
//     );
//   }
// }