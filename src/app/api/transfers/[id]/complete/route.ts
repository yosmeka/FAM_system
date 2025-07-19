// //import { Response } from 'next/server';
// import { prisma } from '@/lib/prisma';
// import { getServerSession } from 'next-auth';
// import { authOptions } from '@/lib/auth';
// import { sendNotification } from '@/lib/notifications';

// // POST /api/transfers/[id]/complete
// export async function POST(
//   request: Request,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   try {
//     const { id } = await params;
//     const session = await getServerSession(authOptions);
//     if (!session || !session.user) {
//       return Response.json({ error: 'Unauthorized' }, { status: 401 });
//     }
//     const transfer = await prisma.transfer.findUnique({
//       where: { id },
//       include: { asset: true, manager: true },
//     });
//     if (!transfer) {
//       return Response.json({ error: 'Transfer not found' }, { status: 404 });
//     }
//     if (transfer.status !== 'APPROVED') {
//       return Response.json({ error: 'Only approved transfers can be completed' }, { status: 400 });
//     }
//     if (transfer.requesterId !== session.user.id) {
//       return Response.json({ error: 'Forbidden: Only the requester can complete this transfer' }, { status: 403 });
//     }
//     // Update transfer status and asset location/status
//     const updatedTransfer = await prisma.transfer.update({
//       where: { id },
//       data: { status: 'COMPLETED' },
//     });
//     const updatedAsset = await prisma.asset.update({
//       where: { id: transfer.assetId },
//       data: {
//         status: 'ACTIVE',
//         location: transfer.toDepartment,
//       },
//     });
//     // Send notification to manager
//     if (transfer.managerId) {
//       await sendNotification({
//         userId: transfer.managerId,
//         message: `Transfer for asset "${transfer.asset?.name || 'Unknown'}" has been completed by the requester.`,
//         type: 'transfer_completed',
//         meta: {
//           assetId: transfer.assetId,
//           transferId: transfer.id,
//         },
//       });
//     }
//     return Response.json({ transfer: updatedTransfer, asset: updatedAsset });
//   } catch (error) {
//     console.error('Error completing transfer:', error);
//     return Response.json({ error: 'Failed to complete transfer' }, { status: 500 });
//   }
// }
