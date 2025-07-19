// import { prisma } from '@/lib/prisma';
// import { getServerSession } from 'next-auth';
// import { authOptions } from '@/lib/auth';
// import { sendNotification } from '@/lib/notifications';

// // POST /api/disposals/[id]/approve
// export async function POST(
//   request: Request,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   const { id } = await params;
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session) {
//       return Response.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     // Check if user is a manager
//     if (session.user.role !== 'MANAGER') {
//       return Response.json(
//         { error: 'Only managers can approve disposal requests' },
//         { status: 403 }
//       );
//     }

//     // Get the disposal request
//     const disposal = await prisma.disposal.findUnique({
//       where: { id },
//       include: {
//         asset: true,
//         requester: true
//       }
//     });

//     if (!disposal) {
//       return Response.json(
//         { error: 'Disposal request not found' },
//         { status: 404 }
//       );
//     }

//     // Check if the request is still pending
//     if (disposal.status !== 'PENDING') {
//       return Response.json(
//         { error: 'Can only approve pending disposal requests' },
//         { status: 400 }
//       );
//     }

//     // Update the disposal status
//     const result = await prisma.disposal.update({
//       where: { id },
//       data: {
//         status: 'APPROVED'
//       },
//       include: {
//         asset: true,
//         requester: true
//       }
//     });

//     // Update the asset status to DISPOSED
//     await prisma.asset.update({
//       where: { id: disposal.assetId },
//       data: {
//         status: 'DISPOSED',
//         currentValue: 0, // Asset is no longer valuable to the organization
//       }
//     });

//     // Send notification to requester
//     if (result.requester?.id) {
//       await sendNotification({
//         userId: result.requester.id,
//         message: `Your disposal request for asset "${result.asset.name}" has been approved.`,
//         type: 'disposal_approved',
//         meta: { assetId: result.asset.id, disposalId: result.id },
//       });
//     }

//     return Response.json(result);
//   } catch (error) {
//     console.error('Error approving disposal:', error);
//     return Response.json(
//       { error: 'Failed to approve disposal request' },
//       { status: 500 }
//     );
//   }
// }

// export async function PUT(
//   request: Request,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   const { id } = await params;
//   try {
//     const session = await getServerSession(authOptions);

//     if (!session) {
//       return Response.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     // Get the disposal request
//     const disposal = await prisma.disposal.findUnique({
//       where: { id },
//       include: { asset: true }
//     });

//     if (!disposal) {
//       return Response.json({ error: 'Disposal not found' }, { status: 404 });
//     }

//     // Update the disposal status
//     const updatedDisposal = await prisma.disposal.update({
//       where: { id },
//       data: { status: 'COMPLETED' },
//       include: { asset: true }
//     });

//     // Update the asset's status
//     await prisma.asset.update({
//       where: { id: disposal.assetId },
//       data: {
//         status: 'DISPOSED',
//         currentValue: 0, // Set value to 0 when disposed
//       }
//     });

//     return Response.json(updatedDisposal);
//   } catch (error) {
//     console.error('Error approving disposal:', error);
//     return Response.json({ error: 'Internal Server Error' }, { status: 500 });
//   }
// }
