// //import { Response } from 'next/server';
// import { prisma } from '@/lib/prisma';

// // GET /api/transfers/[id]
// import { getServerSession } from 'next-auth';
// import { authOptions } from '@/lib/auth';
// import { DocumentMeta, PrismaDocumentClient } from '@/types/document';

// export async function GET(
//   _request: Request,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   const { id } = await params;
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session || !session.user) {
//       return Response.json(
//         { error: 'Unauthorized' },
//         { status: 401 }
//       );
//     }
//     const transfer = await prisma.transfer.findUnique({
//       where: { id },
//       include: {
//         asset: {
//           select: {
//             id: true,
//             name: true,
//             serialNumber: true,
//             status: true,
//             location: true,
//             currentValue: true,
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
//             id: true,
//             name: true,
//             email: true,
//           },
//         },
//       },
//     });

//     // If transfer is approved, rejected, or completed, check for document
//     let document = null;
//     if (transfer && (transfer.status === 'APPROVED' || transfer.status === 'REJECTED' || transfer.status === 'COMPLETED')) {
//       document = await (prisma as unknown as { document: PrismaDocumentClient }).document.findFirst({
//         where: {
//           assetId: transfer.assetId,
//           type: transfer.status === 'REJECTED' ? 'TRANSFER_REJECTION' : 'TRANSFER_APPROVAL',
//         },
//         select: {
//           id: true,
//           url: true,
//           fileName: true,
//           type: true,
//           meta: true,
//         }
//       });

//       // Filter documents by transferId in meta if there are multiple
//       if (document && document.meta) {
//         const meta = document.meta as DocumentMeta;
//         if (meta.transferId !== id) {
//           document = null;
//         }
//       }
//     }

//     if (!transfer) {
//       return Response.json(
//         { error: 'Transfer not found' },
//         { status: 404 }
//       );
//     }

//     // Only allow MANAGER or the user who requested
//     if (session.user.role !== 'MANAGER' && transfer.requesterId !== session.user.id) {
//       return Response.json(
//         { error: 'Forbidden' },
//         { status: 403 }
//       );
//     }

//     // Map fromDepartment/toDepartment to fromLocation/toLocation for frontend compatibility
//     const result = {
//       ...transfer,
//       fromLocation: transfer.fromDepartment,
//       toLocation: transfer.toDepartment,
//       document: document,
//       manager: transfer.manager,
//       managerId: transfer.managerId,
//     };
//     return Response.json(result);
//   } catch (error) {
//     console.error('Error:', error);
//     return Response.json(
//       { error: 'Failed to fetch transfer' },
//       { status: 500 }
//     );
//   }
// }

// // PUT /api/transfers/[id]
// export async function PUT(
//   request: Request,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   const { id } = await params;
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session || !session.user) {
//       return Response.json(
//         { error: 'Unauthorized' },
//         { status: 401 }
//       );
//     }

//     const body = await request.json();
//     const transfer = await prisma.transfer.findUnique({ where: { id } });

//     if (!transfer) {
//       return Response.json({ error: 'Transfer not found' }, { status: 404 });
//     }

//     // Only allow editing if transfer is still PENDING
//     if (transfer.status !== 'PENDING') {
//       return Response.json(
//         { error: 'Only PENDING transfers can be edited' },
//         { status: 400 }
//       );
//     }

//     // If manager, allow status update (approval/rejection)
//     if (session.user.role === 'MANAGER' && body.status) {
//       const updated = await prisma.transfer.update({
//         where: { id },
//         data: { status: body.status },
//       });
//       const result = {
//         ...updated,
//         fromLocation: updated.fromDepartment,
//         toLocation: updated.toDepartment,
//       };
//       return Response.json(result);
//     }

//     // If requester, allow editing toDepartment and reason
//     if (transfer.requesterId === session.user.id) {
//       const updated = await prisma.transfer.update({
//         where: { id },
//         data: {
//           toDepartment: body.toDepartment,
//           reason: body.reason,
//         },
//       });
//       const result = {
//         ...updated,
//         fromLocation: updated.fromDepartment,
//         toLocation: updated.toDepartment,
//       };
//       return Response.json(result);
//     }

//     // Otherwise, forbidden
//     return Response.json(
//       { error: 'Forbidden: Not allowed to edit this transfer' },
//       { status: 403 }
//     );
//   } catch (error) {
//     console.error('Error:', error);
//     return Response.json(
//       { error: 'Failed to update transfer' },
//       { status: 500 }
//     );
//   }
// }


// // DELETE /api/transfers/[id]
// export async function DELETE(
//   _request: Request,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   const { id } = await params;
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session || !session.user) {
//       return Response.json(
//         { error: 'Unauthorized' },
//         { status: 401 }
//       );
//     }
//     // Only allow deletion if user is the requester and transfer is still PENDING
//     const transfer = await prisma.transfer.findUnique({
//       where: { id },
//     });
//     if (!transfer) {
//       return Response.json(
//         { error: 'Transfer not found' },
//         { status: 404 }
//       );
//     }
//     if (transfer.requesterId !== session.user.id) {
//       return Response.json(
//         { error: 'Forbidden: Only the requester can delete this transfer' },
//         { status: 403 }
//       );
//     }
//     if (transfer.status !== 'PENDING') {
//       return Response.json(
//         { error: 'Only PENDING transfers can be deleted' },
//         { status: 400 }
//       );
//     }
//     await prisma.transfer.delete({
//       where: { id },
//     });
//     return Response.json({ success: true });
//   } catch (error) {
//     console.error('Error:', error);
//     return Response.json(
//       { error: 'Failed to delete transfer' },
//       { status: 500 }
//     );
//   }
// }
