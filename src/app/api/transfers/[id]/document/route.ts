//import { Response } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateTransferDocumentPdf } from '@/lib/generateTransferDocumentPdf';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import { DocumentMeta, PrismaDocumentClient } from '@/types/document';
import { DocumentType } from '@prisma/client';
//import crypto from 'crypto';

// GET /api/transfers/[id]/document
// Retrieves the document for a transfer
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Get the transfer
    const transfer = await prisma.transfer.findUnique({
      where: { id },
      include: {
        asset: true,
        requester: true,
      },
    });

    if (!transfer) {
      return Response.json(
        { error: 'Transfer not found' },
        { status: 404 }
      );
    }

    // Only allow the user who requested the transfer to access the document
    // or server-side calls (no session)
    if (session && session.user && transfer.requesterId !== session.user.id) {
      console.log(`GET /api/transfers/${id}/document - Forbidden: User ${session.user.id} is not the requester ${transfer.requesterId}`);
      return Response.json(
        { error: 'Forbidden - Only the requester can access this document' },
        { status: 403 }
      );
    }

    // Check if document exists
    // Log the search parameters for debugging
    console.log(`Searching for document with assetId: ${transfer.assetId}, type: ${transfer.status === 'APPROVED' ? 'TRANSFER_APPROVAL' : 'TRANSFER_REJECTION'}, transferId: ${id}`);

    // Always search for both approval and rejection documents for this transfer
    const documents = await prisma.document.findMany({
      where: {
        assetId: transfer.assetId,
        type: { in: [DocumentType.TRANSFER_APPROVAL, DocumentType.TRANSFER_REJECTION] },
      }
    });

    // Then filter for the specific transfer
    let document = null;
    for (const doc of documents) {
      if (doc.meta && typeof doc.meta === 'object') {
        const meta = doc.meta as DocumentMeta;
        if (meta.transferId === id) {
          document = doc;
          break;
        }
      }
    }

    if (!document) {
      return Response.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Return the document URL
    return Response.json({ documentUrl: document.url });
  } catch (error) {
    console.error('Error:', error);
    return Response.json(
      { error: 'Failed to retrieve document' },
      { status: 500 }
    );
  }
}

// POST /api/transfers/[id]/document
// Generates a document for a transfer
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    console.log(`POST /api/transfers/${id}/document - Session:`, session?.user);

    // Allow document generation even without a session for server-side calls
    if (session && session.user && session.user.role !== 'MANAGER') {
      console.log(`POST /api/transfers/${id}/document - Unauthorized: User role is ${session.user.role}, not MANAGER`);
      return Response.json(
        { error: 'Unauthorized - Only managers can generate documents' },
        { status: 401 }
      );
    }

    // Get the transfer first
    const transfer = await prisma.transfer.findUnique({
      where: { id },
      include: {
        asset: true,
        requester: true,
      },
    });

    if (!transfer) {
      return Response.json(
        { error: 'Transfer not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { managerReason } = body;

    // Check if we're creating a document directly with provided URL
    if (body.documentUrl) {
      console.log(`Creating document directly with URL: ${body.documentUrl}`);

      try {
        // Create a new document in the database using fetch to a database API
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 3000}`}/api/documents`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            assetId: transfer.assetId,
            type: transfer.status === 'APPROVED' ? 'TRANSFER_APPROVAL' : 'TRANSFER_REJECTION',
            url: body.documentUrl,
            fileName: body.fileName,
            fileSize: body.fileSize,
            filePath: body.filePath,
            mimeType: 'application/pdf',
            meta: {
              transferId: id,
              status: transfer.status,
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to create document: ${await response.text()}`);
        }

        const result = await response.json();
        const document = result.document;

        console.log(`Created new document: ${document.id}`);
        return Response.json({ document });
      } catch (error) {
        console.error('Error creating document:', error);
        return Response.json(
          { error: 'Failed to create document' },
          { status: 500 }
        );
      }
    }

    if (!transfer) {
      return Response.json(
        { error: 'Transfer not found' },
        { status: 404 }
      );
    }

    // Check if transfer is approved or rejected
    if (transfer.status !== 'APPROVED' && transfer.status !== 'REJECTED') {
      return Response.json(
        { error: 'Transfer must be approved or rejected to generate a document' },
        { status: 400 }
      );
    }

    // Generate the PDF
    const pdfBlob = await generateTransferDocumentPdf({
      transferId: transfer.id,
      assetName: transfer.asset.name || 'Unknown Asset',
      assetSerialNumber: transfer.asset.serialNumber,
      fromLocation: transfer.fromDepartment,
      toLocation: transfer.toDepartment,
      requesterName: transfer.requester.name || 'Unknown User',
      requesterEmail: transfer.requester.email,
      managerName: session?.user?.name || 'Unknown Manager',
      managerEmail: session?.user?.email || '',
      requestReason: transfer.reason,
      managerReason: managerReason || transfer.managerReason || '',
      status: transfer.status as 'APPROVED' | 'REJECTED',
      requestDate: transfer.createdAt,
      responseDate: new Date(),
    });

    // Create directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'transfers');
    await mkdir(uploadDir, { recursive: true });

    // Save the PDF to the file system
    const fileName = `transfer_${transfer.status.toLowerCase()}_${transfer.id}.pdf`;
    const filePath = join(uploadDir, fileName);
    const arrayBuffer = await pdfBlob.arrayBuffer();
    await writeFile(filePath, Buffer.from(arrayBuffer));

    // Create a URL for the document
    const documentUrl = `/uploads/transfers/${fileName}`;

    // Check if document already exists
    console.log(`Checking for existing document for transfer ${id}`);

    // First, get all documents for this asset with the right type
    const existingDocuments = await prisma.document.findMany({
      where: {
        assetId: transfer.assetId,
        type: transfer.status === 'APPROVED' ? DocumentType.TRANSFER_APPROVAL : DocumentType.TRANSFER_REJECTION,
      }
    });

    console.log(`Found ${existingDocuments.length} existing documents matching asset and type`);

    // Then filter for the specific transfer
    let existingDocument = null;
    for (const doc of existingDocuments) {
      console.log(`Checking existing document: ${doc.id}, meta:`, doc.meta);
      if (doc.meta && typeof doc.meta === 'object') {
        const meta = doc.meta as DocumentMeta;
        if (meta.transferId === id) {
          existingDocument = doc;
          console.log(`Found matching existing document: ${doc.id}`);
          break;
        }
      }
    }

    let document;
    if (existingDocument) {
      // Update existing document
      console.log(`Updating existing document ${existingDocument.id} for transfer ${id}`);
      const updateData = {
        url: documentUrl,
        fileName,
        fileSize: arrayBuffer.byteLength,
        filePath,
        mimeType: 'application/pdf',
        updatedAt: new Date(),
        meta: {
          transferId: id,
          status: transfer.status,
        },
      };
      console.log('Update data:', updateData);

      document = await prisma.document.update({
        where: { id: existingDocument.id },
        data: updateData,
      });

      console.log(`Updated document with ID: ${document.id}, meta:`, document.meta);
    } else {
      // Create new document
      console.log(`Creating new document for transfer ${id}`);
      const documentData = {
        assetId: transfer.assetId,
        type: transfer.status === 'APPROVED' ? DocumentType.TRANSFER_APPROVAL : DocumentType.TRANSFER_REJECTION,
        url: documentUrl,
        fileName,
        fileSize: arrayBuffer.byteLength,
        filePath,
        mimeType: 'application/pdf',
        meta: {
          transferId: id, // Make sure we use the correct transfer ID
          status: transfer.status,
        },
      };
      console.log('Document data:', documentData);

      document = await prisma.document.create({
        data: documentData,
      });

      console.log(`Created new document with ID: ${document.id}, meta:`, document.meta);
    }

    return Response.json({ document });
  } catch (error) {
    console.error('Error:', error);
    return Response.json(
      { error: 'Failed to generate document' },
      { status: 500 }
    );
  }
}
