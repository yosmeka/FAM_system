// import { getServerSession } from 'next-auth';
// import { authOptions } from '@/lib/auth';
// import { prisma } from '@/lib/prisma';
// import { withRole } from '@/middleware/rbac';

// // GET /api/audit-assignments/[id] - Get specific audit assignment
// export const GET = withRole([ 'MANAGER', 'AUDITOR'], async function GET(
//   req: Request,
//   ...args: unknown[]
// ) {
//   const { params } = (args[0] || {}) as { params: Promise<{ id: string }> };
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session?.user?.id) {
//       return Response.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     const { id } = await params;
//     const assignment = await prisma.auditAssignment.findUnique({
//       where: { id },
//       include: {
//         asset: {
//           select: {
//             id: true,
//             name: true,
//             serialNumber: true,
//             department: true,
//             category: true,
//             location: true,
//             status: true,
//           },
//         },
//         assignedTo: {
//           select: {
//             id: true,
//             name: true,
//             email: true,
//           },
//         },
//         assignedBy: {
//           select: {
//             id: true,
//             name: true,
//             email: true,
//           },
//         },
//         audits: {
//           include: {
//             auditor: {
//               select: {
//                 id: true,
//                 name: true,
//                 email: true,
//               },
//             },
//           },
//           orderBy: {
//             auditDate: 'desc',
//           },
//         },
//       },
//     });

//     if (!assignment) {
//       return Response.json({ error: 'Assignment not found' }, { status: 404 });
//     }

//     // Check access permissions
//     const userRole = session.user.role;
//     const userId = session.user.id;

//     if (userRole === 'AUDITOR' && assignment.assignedToId !== userId) {
//       return Response.json({ error: 'Access denied' }, { status: 403 });
//     }

//     if (userRole === 'MANAGER' && assignment.assignedById !== userId) {
//       // Managers can only see assignments they created
//       // You could extend this to include department-based access
//       return Response.json({ error: 'Access denied' }, { status: 403 });
//     }

//     return Response.json(assignment);
//   } catch (error) {
//     console.error('Error fetching audit assignment:', error);
//     return Response.json(
//       { error: 'Failed to fetch audit assignment' },
//       { status: 500 }
//     );
//   }
// });

// // PUT /api/audit-assignments/[id] - Update audit assignment
// export const PUT = withRole(['MANAGER', 'AUDITOR'], async function PUT(
//   req: Request,
//   ...args: unknown[]
// ) {
//   const { params } = (args[0] || {}) as { params: Promise<{ id: string }> };
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session?.user?.id) {
//       return Response.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     const body = await req.json();
//     const { action, ...updateData } = body;

//     const { id } = await params;
//     // Get current assignment
//     const currentAssignment = await prisma.auditAssignment.findUnique({
//       where: { id },
//       select: {
//         id: true,
//         assignedToId: true,
//         assignedById: true,
//         status: true,
//       },
//     });

//     if (!currentAssignment) {
//       return Response.json({ error: 'Assignment not found' }, { status: 404 });
//     }

//     const userRole = session.user.role;
//     const userId = session.user.id;

//     // Handle different actions based on user role
//     let updateFields: any = {};

//     if (action === 'accept' && userRole === 'AUDITOR' && currentAssignment.assignedToId === userId) {
//       updateFields = {
//         status: 'ACCEPTED',
//         acceptedAt: new Date(),
//       };
//     } else if (action === 'start' && userRole === 'AUDITOR' && currentAssignment.assignedToId === userId) {
//       updateFields = {
//         status: 'IN_PROGRESS',
//         startedAt: new Date(),
//       };
//     } else if (action === 'complete' && userRole === 'AUDITOR' && currentAssignment.assignedToId === userId) {
//       updateFields = {
//         status: 'COMPLETED',
//         completedAt: new Date(),
//         actualHours: updateData.actualHours,
//       };
//     } else if (action === 'cancel' && (userRole === 'MANAGER' || userRole === 'ADMIN')) {
//       if (userRole === 'MANAGER' && currentAssignment.assignedById !== userId) {
//         return Response.json({ error: 'Access denied' }, { status: 403 });
//       }
//       updateFields = {
//         status: 'CANCELLED',
//         cancelledAt: new Date(),
//         cancellationReason: updateData.cancellationReason,
//       };
//     } else if (userRole === 'MANAGER' || userRole === 'ADMIN') {
//       // Managers can update assignment details
//       if (userRole === 'MANAGER' && currentAssignment.assignedById !== userId) {
//         return Response.json({ error: 'Access denied' }, { status: 403 });
//       }

//       const allowedFields = [
//         'title',
//         'description',
//         'priority',
//         'dueDate',
//         'scheduledDate',
//         'instructions',
//         'checklistItems',
//         'estimatedHours',
//       ];

//       allowedFields.forEach(field => {
//         if (updateData[field] !== undefined) {
//           if (field === 'dueDate' || field === 'scheduledDate') {
//             updateFields[field] = updateData[field] ? new Date(updateData[field]) : null;
//           } else if (field === 'checklistItems') {
//             updateFields[field] = updateData[field] ? JSON.stringify(updateData[field]) : null;
//           } else {
//             updateFields[field] = updateData[field];
//           }
//         }
//       });
//     } else {
//       return Response.json({ error: 'Invalid action or insufficient permissions' }, { status: 400 });
//     }

//     const updatedAssignment = await prisma.auditAssignment.update({
//       where: { id },
//       data: updateFields,
//       include: {
//         asset: {
//           select: {
//             id: true,
//             name: true,
//             serialNumber: true,
//             department: true,
//             category: true,
//             location: true,
//           },
//         },
//         assignedTo: {
//           select: {
//             id: true,
//             name: true,
//             email: true,
//           },
//         },
//         assignedBy: {
//           select: {
//             id: true,
//             name: true,
//             email: true,
//           },
//         },
//       },
//     });

//     return Response.json(updatedAssignment);
//   } catch (error) {
//     console.error('Error updating audit assignment:', error);
//     return Response.json(
//       { error: 'Failed to update audit assignment' },
//       { status: 500 }
//     );
//   }
// });

// // DELETE /api/audit-assignments/[id] - Delete audit assignment (Manager/Admin only)
// export const DELETE = withRole([ 'MANAGER'], async function DELETE(
//   req: Request,
//   ...args: unknown[]
// ) {
//   const { params } = (args[0] || {}) as { params: Promise<{ id: string }> };
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session?.user?.id) {
//       return Response.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     const { id } = await params;
//     // Check if assignment exists and user has permission
//     const assignment = await prisma.auditAssignment.findUnique({
//       where: { id },
//       select: {
//         id: true,
//         assignedById: true,
//         status: true,
//       },
//     });

//     if (!assignment) {
//       return Response.json({ error: 'Assignment not found' }, { status: 404 });
//     }

//     // Managers can only delete assignments they created
//     if (session.user.role === 'MANAGER' && assignment.assignedById !== session.user.id) {
//       return Response.json({ error: 'Access denied' }, { status: 403 });
//     }

//     // Don't allow deletion of completed assignments
//     if (assignment.status === 'COMPLETED') {
//       return Response.json(
//         { error: 'Cannot delete completed assignments' },
//         { status: 400 }
//       );
//     }

//     await prisma.auditAssignment.delete({
//       where: { id },
//     });

//     return Response.json({ message: 'Assignment deleted successfully' });
//   } catch (error) {
//     console.error('Error deleting audit assignment:', error);
//     return Response.json(
//       { error: 'Failed to delete audit assignment' },
//       { status: 500 }
//     );
//   }
// });
