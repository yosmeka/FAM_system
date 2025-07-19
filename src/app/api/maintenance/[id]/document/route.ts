// import { prisma } from '@/lib/prisma';
// import { getServerSession } from 'next-auth';
// import { authOptions } from '@/lib/auth';
// import { generateMaintenanceDocumentPdf } from '@/lib/generateMaintenanceDocumentPdf';
// import { writeFile } from 'fs/promises';
// import { join } from 'path';
// import { mkdir } from 'fs/promises';
// import { DocumentMeta } from '@/types/document';
// import { DocumentType } from '@prisma/client';

// // POST /api/maintenance/[id]/document
// // Generates a document for a maintenance request
// export async function POST(
//   request: Request,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   try {
//     const { id } = await params;
//     const session = await getServerSession(authOptions);
//     console.log(`POST /api/maintenance/${id}/document - Session:`, session?.user);

//     // Allow document generation even without a session for server-side calls
//     if (session && session.user && session.user.role !== 'MANAGER' && session.user.role !== 'ADMIN') {
//       console.log(`POST /api/maintenance/${id}/document - Unauthorized: User role is ${session.user.role}, not MANAGER or ADMIN`);
//       return Response.json(
//         { error: 'Unauthorized - Only managers can generate documents' },
//         { status: 401 }
//       );
//     }

//     // Get the maintenance request with related data
//     const maintenance = await prisma.maintenance.findUnique({
//       where: { id },
//       include: {
//         asset: true,
//         requester: true,
//         manager: true,
//       },
//     });

//     if (!maintenance) {
//       console.log(`POST /api/maintenance/${id}/document - Maintenance request not found`);
//       return Response.json(
//         { error: 'Maintenance request not found' },
//         { status: 404 }
//       );
//     }

//     // Check if the maintenance request is approved or rejected
//     if (maintenance.status !== 'APPROVED' && maintenance.status !== 'REJECTED') {
//       console.log(`POST /api/maintenance/${id}/document - Maintenance request is not approved or rejected: ${maintenance.status}`);
//       return Response.json(
//         { error: 'Maintenance request must be approved or rejected to generate a document' },
//         { status: 400 }
//       );
//     }

//     // Parse the request body
//     const body = await request.json();
//     const managerNotes = body.managerNotes || maintenance.notes || '';

//     // Generate the PDF
//     const pdfBlob = await generateMaintenanceDocumentPdf({
//       maintenanceId: maintenance.id,
//       assetName: maintenance.asset.name || 'Unknown Asset',
//       assetSerialNumber: maintenance.asset.serialNumber,
//       description: maintenance.description,
//       priority: maintenance.priority,
//       requesterName: maintenance.requester.name || 'Unknown User',
//       requesterEmail: maintenance.requester.email,
//       managerName: maintenance.manager?.name || session?.user?.name || 'Unknown Manager',
//       managerEmail: maintenance.manager?.email || session?.user?.email || '',
//       requestReason: maintenance.description,
//       managerNotes: managerNotes,
//       status: maintenance.status as 'APPROVED' | 'REJECTED',
//       requestDate: maintenance.createdAt,
//       responseDate: new Date(),
//       scheduledDate: maintenance.scheduledDate ?? undefined,
//     });

//     // Create directory if it doesn't exist
//     const uploadDir = join(process.cwd(), 'public', 'uploads', 'maintenance');
//     await mkdir(uploadDir, { recursive: true });

//     // Save the PDF to the file system
//     const fileName = `maintenance_${maintenance.status.toLowerCase()}_${maintenance.id}.pdf`;
//     const filePath = join(uploadDir, fileName);
//     const arrayBuffer = await pdfBlob.arrayBuffer();
//     await writeFile(filePath, Buffer.from(arrayBuffer));

//     // Create a URL for the document
//     const documentUrl = `/uploads/maintenance/${fileName}`;

//     // Check if document already exists
//     console.log(`Checking for existing document for maintenance ${id}`);

//     // Try multiple ways to find the document
//     let existingDocument = await prisma.document.findFirst({
//       where: {
//         assetId: maintenance.assetId,
//         meta: {
//           path: ['maintenanceId'],
//           equals: id,
//         },
//       },
//     });

//     // If not found, try by type
//     if (!existingDocument) {
//       console.log(`No document found by meta.maintenanceId, trying by type...`);
//       existingDocument = await prisma.document.findFirst({
//         where: {
//           assetId: maintenance.assetId,
//           type: {
//             in: ['MAINTENANCE_APPROVAL', 'MAINTENANCE_REJECTION'],
//           },
//           createdAt: {
//             // Look for documents created within the last hour
//             gte: new Date(new Date().getTime() - 60 * 60 * 1000),
//           },
//         },
//       });

//       if (existingDocument) {
//         console.log(`Found document by type: ${existingDocument.id}`);
//       }
//     }

//     let document;
//     if (existingDocument) {
//       // Update existing document
//       console.log(`Updating existing document for maintenance ${id}`);

//       // Get the requester ID
//       const requesterId = maintenance.requesterId;
//       console.log(`Requester ID for update: ${requesterId}`);

//       // Create update data
//       const updateData = {
//         url: documentUrl,
//         fileName,
//         fileSize: arrayBuffer.byteLength,
//         filePath,
//         updatedAt: new Date(),
//         type: maintenance.status === 'APPROVED' ? DocumentType.MAINTENANCE_APPROVAL : DocumentType.MAINTENANCE_REJECTION,
//         meta: {
//           ...(existingDocument.meta as DocumentMeta),
//           maintenanceId: id,
//           status: maintenance.status,
//           requesterId: requesterId, // Associate with the requester
//           updatedAt: new Date().toISOString(),
//           documentType: maintenance.status === 'APPROVED' ? DocumentType.MAINTENANCE_APPROVAL : DocumentType.MAINTENANCE_REJECTION,
//         },
//       };

//       console.log('Updating document with data:', updateData);

//       // Update the document
//       document = await prisma.document.update({
//         where: { id: existingDocument.id },
//         data: updateData,
//       });

//       console.log(`Updated document with ID: ${document.id}, meta:`, document.meta);
//     } else {
//       // Create new document
//       console.log(`Creating new document for maintenance ${id}`);

//       // Get the requester ID
//       const requesterId = maintenance.requesterId;
//       console.log(`Requester ID: ${requesterId}`);

//       // Create document data
//       const documentData = {
//         assetId: maintenance.assetId,
//         type: maintenance.status === 'APPROVED' ? DocumentType.MAINTENANCE_APPROVAL : DocumentType.MAINTENANCE_REJECTION,
//         url: documentUrl,
//         fileName,
//         fileSize: arrayBuffer.byteLength,
//         filePath,
//         mimeType: 'application/pdf',
//         meta: {
//           maintenanceId: id,
//           status: maintenance.status,
//           requesterId: requesterId, // Associate with the requester
//           createdAt: new Date().toISOString(),
//           documentType: maintenance.status === 'APPROVED' ? DocumentType.MAINTENANCE_APPROVAL : DocumentType.MAINTENANCE_REJECTION,
//         },
//       };

//       console.log('Creating document with data:', documentData);

//       // Create the document
//       document = await prisma.document.create({
//         data: documentData,
//       });

//       console.log(`Created new document with ID: ${document.id}, meta:`, document.meta);
//     }

//     return Response.json({ document });
//   } catch (error) {
//     console.error('Error generating maintenance document:', error);
//     return Response.json(
//       { error: 'Failed to generate document' },
//       { status: 500 }
//     );
//   }
// }
// // import { NextResponse } from 'next/server';
// // import { prisma } from '@/lib/prisma';
// // import { getServerSession } from 'next-auth';
// // import { authOptions } from '@/lib/auth';
// // import { generateMaintenanceDocumentPdf } from '@/lib/generateMaintenanceDocumentPdf';
// // import { writeFile } from 'fs/promises';
// // import { join } from 'path';
// // import { mkdir } from 'fs/promises';
// // import { DocumentMeta } from '@/types/document';

// // // POST /api/maintenance/[id]/document
// // // Generates a document for a maintenance request
// // export async function POST(
// //   request: Request,
// //   { params }: { params: { id: string } }
// // ) {
// //   try {
// //     const id = params.id;
// //     const session = await getServerSession(authOptions);
// //     console.log(`POST /api/maintenance/${id}/document - Session:`, session?.user);

// //     // Allow document generation even without a session for server-side calls
// //     if (session && session.user && session.user.role !== 'MANAGER' && session.user.role !== 'ADMIN') {
// //       console.log(`POST /api/maintenance/${id}/document - Unauthorized: User role is ${session.user.role}, not MANAGER or ADMIN`);
// //       return NextResponse.json(
// //         { error: 'Unauthorized - Only managers can generate documents' },
// //         { status: 401 }
// //       );
// //     }

// //     // Get the maintenance request with related data
// //     const maintenance = await prisma.maintenance.findUnique({
// //       where: { id },
// //       include: {
// //         asset: true,
// //         requester: true,
// //         manager: true,
// //       },
// //     });

// //     if (!maintenance) {
// //       console.log(`POST /api/maintenance/${id}/document - Maintenance request not found`);
// //       return NextResponse.json(
// //         { error: 'Maintenance request not found' },
// //         { status: 404 }
// //       );
// //     }

// //     // Check if the maintenance request is approved or rejected
// //     if (maintenance.status !== 'APPROVED' && maintenance.status !== 'REJECTED') {
// //       console.log(`POST /api/maintenance/${id}/document - Maintenance request is not approved or rejected: ${maintenance.status}`);
// //       return NextResponse.json(
// //         { error: 'Maintenance request must be approved or rejected to generate a document' },
// //         { status: 400 }
// //       );
// //     }

// //     // Parse the request body
// //     const body = await request.json();
// //     const managerNotes = body.managerNotes || maintenance.notes || '';

// //     // Generate the PDF
// //     const pdfBlob = await generateMaintenanceDocumentPdf({
// //       maintenanceId: maintenance.id,
// //       assetName: maintenance.asset.name || 'Unknown Asset',
// //       assetSerialNumber: maintenance.asset.serialNumber,
// //       description: maintenance.description,
// //       priority: maintenance.priority,
// //       requesterName: maintenance.requester.name || 'Unknown User',
// //       requesterEmail: maintenance.requester.email,
// //       managerName: maintenance.manager?.name || session?.user?.name || 'Unknown Manager',
// //       managerEmail: maintenance.manager?.email || session?.user?.email || '',
// //       requestReason: maintenance.description,
// //       managerNotes: managerNotes,
// //       status: maintenance.status as 'APPROVED' | 'REJECTED',
// //       requestDate: maintenance.createdAt,
// //       responseDate: new Date(),
// //       scheduledDate: maintenance.scheduledDate ?? undefined,
// //     });

// //     // Create directory if it doesn't exist
// //     const uploadDir = join(process.cwd(), 'public', 'uploads', 'maintenance');
// //     await mkdir(uploadDir, { recursive: true });

// //     // Save the PDF to the file system
// //     const fileName = `maintenance_${maintenance.status.toLowerCase()}_${maintenance.id}.pdf`;
// //     const filePath = join(uploadDir, fileName);
// //     const arrayBuffer = await pdfBlob.arrayBuffer();
// //     await writeFile(filePath, Buffer.from(arrayBuffer));

// //     // Create a URL for the document
// //     const documentUrl = `/uploads/maintenance/${fileName}`;

// //     // Check if document already exists
// //     console.log(`Checking for existing document for maintenance ${id}`);

// //     // Try multiple ways to find the document
// //     let existingDocument = await prisma.document.findFirst({
// //       where: {
// //         assetId: maintenance.assetId,
// //         meta: {
// //           path: ['maintenanceId'],
// //           equals: id,
// //         },
// //       },
// //     });

// //     // If not found, try by type
// //     if (!existingDocument) {
// //       console.log(`No document found by meta.maintenanceId, trying by type...`);
// //       existingDocument = await prisma.document.findFirst({
// //         where: {
// //           assetId: maintenance.assetId,
// //           type: {
// //             in: ['MAINTENANCE_APPROVAL', 'MAINTENANCE_REJECTION'],
// //           },
// //           createdAt: {
// //             // Look for documents created within the last hour
// //             gte: new Date(new Date().getTime() - 60 * 60 * 1000),
// //           },
// //         },
// //       });

// //       if (existingDocument) {
// //         console.log(`Found document by type: ${existingDocument.id}`);
// //       }
// //     }

// //     let document;
// //     if (existingDocument) {
// //       // Update existing document
// //       console.log(`Updating existing document for maintenance ${id}`);

// //       // Get the requester ID
// //       const requesterId = maintenance.requesterId;
// //       console.log(`Requester ID for update: ${requesterId}`);

// //       // Create update data
// //       const updateData = {
// //         url: documentUrl,
// //         fileName,
// //         fileSize: arrayBuffer.byteLength,
// //         filePath,
// //         updatedAt: new Date(),
// //         type: maintenance.status === 'APPROVED' ? DocumentType.MAINTENANCE_APPROVAL : DocumentType.MAINTENANCE_REJECTION,
// //         meta: {
// //           ...(existingDocument.meta as DocumentMeta),
// //           maintenanceId: id,
// //           status: maintenance.status,
// //           requesterId: requesterId, // Associate with the requester
// //           updatedAt: new Date().toISOString(),
// //           documentType: maintenance.status === 'APPROVED' ? DocumentType.MAINTENANCE_APPROVAL : DocumentType.MAINTENANCE_REJECTION,
// //         },
// //       };

// //       console.log('Updating document with data:', updateData);

// //       // Update the document
// //       document = await prisma.document.update({
// //         where: { id: existingDocument.id },
// //         data: updateData,
// //       });

// //       console.log(`Updated document with ID: ${document.id}, meta:`, document.meta);
// //     } else {
// //       // Create new document
// //       console.log(`Creating new document for maintenance ${id}`);

// //       // Get the requester ID
// //       const requesterId = maintenance.requesterId;
// //       console.log(`Requester ID: ${requesterId}`);

// //       // Create document data
// //       const documentData = {
// //         assetId: maintenance.assetId,
// //         type: maintenance.status === 'APPROVED' ? DocumentType.MAINTENANCE_APPROVAL : DocumentType.MAINTENANCE_REJECTION,
// //         url: documentUrl,
// //         fileName,
// //         fileSize: arrayBuffer.byteLength,
// //         filePath,
// //         mimeType: 'application/pdf',
// //         meta: {
// //           maintenanceId: id,
// //           status: maintenance.status,
// //           requesterId: requesterId, // Associate with the requester
// //           createdAt: new Date().toISOString(),
// //           documentType: maintenance.status === 'APPROVED' ? DocumentType.MAINTENANCE_APPROVAL : DocumentType.MAINTENANCE_REJECTION,
// //         },
// //       };

// //       console.log('Creating document with data:', documentData);

// //       // Create the document
// //       document = await prisma.document.create({
// //         data: documentData,
// //       });

// //       console.log(`Created new document with ID: ${document.id}, meta:`, document.meta);
// //     }

// //     return NextResponse.json({ document });
// //   } catch (error) {
// //     console.error('Error generating maintenance document:', error);
// //     return NextResponse.json(
// //       { error: 'Failed to generate document' },
// //       { status: 500 }
// //     );
// //   }
// // }