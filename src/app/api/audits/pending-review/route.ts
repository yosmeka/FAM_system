// //import { Response } from 'next/server';
// import { getServerSession } from 'next-auth';
// import { authOptions } from '@/lib/auth';
// import { prisma } from '@/lib/prisma';
// import { withRole } from '@/middleware/rbac';

// // GET /api/audits/pending-review - Get audits pending manager review
// export const GET = withRole(['MANAGER'], async function GET() {
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session?.user?.id) {
//       return Response.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     const userRole = session.user.role;
//     const userId = session.user.id;

//     // Build where clause based on role
//     let whereClause: any = {
//       workflowStatus: 'PENDING_REVIEW',
//       status: 'COMPLETED',
//     };

//     // Managers can only see audits they are responsible for
//     if (userRole === 'MANAGER') {
//       whereClause.OR = [
//         // Audits from assignments they created
//         {
//           assignment: {
//             assignedById: userId,
//           },
//         },
//         // Audits from requests assigned to them
//         {
//           request: {
//             managerId: userId,
//           },
//         },
//       ];
//     }
//     // ADMINs can see all pending audits (no additional filter needed)

//     const pendingAudits = await prisma.assetAudit.findMany({
//       where: whereClause,
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
//         auditor: {
//           select: {
//             id: true,
//             name: true,
//             email: true,
//           },
//         },
//         assignment: {
//           select: {
//             id: true,
//             title: true,
//             assignedById: true,
//           },
//         },
//         request: {
//           select: {
//             id: true,
//             title: true,
//             managerId: true,
//           },
//         },
//       },
//       orderBy: [
//         {
//           auditDate: 'asc', // Oldest audits first (most urgent)
//         },
//       ],
//     });

//     // Parse checklistItems JSON if it exists
//     const formattedAudits = pendingAudits.map(audit => ({
//       ...audit,
//       checklistItems: audit.checklistItems ? 
//         (typeof audit.checklistItems === 'string' ? 
//           JSON.parse(audit.checklistItems) : 
//           audit.checklistItems) : 
//         null,
//     }));

//     return Response.json(formattedAudits);
//   } catch (error) {
//     console.error('Error fetching pending audits:', error);
//     return Response.json(
//       { error: 'Failed to fetch pending audits' },
//       { status: 500 }
//     );
//   }
// });
