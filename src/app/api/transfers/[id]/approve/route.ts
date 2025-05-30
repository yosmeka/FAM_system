import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendNotification } from '@/lib/notifications';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { mkdir } from 'fs/promises';

// POST /api/transfers/[id]/approve
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Update the transfer status to APPROVED
    const { id } = await params;
    let reason = '';
    if (request.headers.get('content-type')?.includes('application/json')) {
      try {
        const body = await request.json();
        reason = body.reason || '';
      } catch (e) {
        // Ignore JSON parse error for approval
      }
    }
    const transfer = await prisma.transfer.update({
      where: { id },
      data: {
        status: 'APPROVED',
      },
      include: {
        asset: true,
      },
    });

    // Ensure toDepartment (used as location) is set
    if (!transfer.toDepartment) {
      return NextResponse.json({ error: 'Transfer request missing destination location.' }, { status: 400 });
    }

    // Update asset location and status using toDepartment as the new location
    const updatedAsset = await prisma.asset.update({
      where: { id: transfer.assetId },
      data: {
        status: 'TRANSFERRED',
        location: transfer.toDepartment,
      },
    });

    // Track the change in asset history, but don't fail the main operation if this fails
    try {
      await prisma.assetHistory.create({
        data: {
          assetId: transfer.assetId,
          field: 'location',
          oldValue: transfer.asset.location || '',
          newValue: transfer.toDepartment,
          changedBy: (await getServerSession(authOptions))?.user?.email || 'system',
        }
      });
    } catch (historyError) {
      console.error('Asset history logging failed:', historyError);
      // Continue without throwing
    }

    // Generate approval document
    let documentUrl = '';
    try {
      console.log(`Directly generating document for transfer ${id}`);

      // Import the document generation function
      const { generateTransferDocumentPdf } = await import('@/lib/generateTransferDocumentPdf');

      // Get the requester information
      const requester = await prisma.user.findUnique({
        where: { id: transfer.requesterId },
        select: { name: true, email: true }
      });

      // Get the manager information
      const session = await getServerSession(authOptions);

      // Generate the PDF
      const pdfBuffer = await generateTransferDocumentPdf({
        transferId: id,
        assetName: transfer.asset?.name || 'Unknown Asset',
        assetSerialNumber: transfer.asset?.serialNumber || 'Unknown',
        fromLocation: transfer.fromDepartment,
        toLocation: transfer.toDepartment,
        requesterName: requester?.name || 'Unknown User',
        requesterEmail: requester?.email || '',
        managerName: session?.user?.name || 'Unknown Manager',
        managerEmail: session?.user?.email || '',
        requestReason: transfer.reason,
        managerReason: reason || '',
        status: 'APPROVED',
        requestDate: transfer.createdAt,
        responseDate: new Date(),
      });

      // Create directory if it doesn't exist
      const uploadDir = join(process.cwd(), 'public', 'uploads', 'documents');
      await mkdir(uploadDir, { recursive: true });

      // Convert Blob to Buffer
      const arrayBuffer = await pdfBuffer.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Save the PDF
      const fileName = `transfer_approval_${id}.pdf`;
      const filePath = join(uploadDir, fileName);
      await writeFile(filePath, buffer);

      // Create the document URL
      let documentUrl = `/uploads/documents/${fileName}`;

      console.log(`Document saved to ${filePath}`);

      // Use direct database connection to create document
      try {
        // First, check if a document already exists
        const result = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 3000}`}/api/transfers/${id}/document`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            managerReason: reason,
            documentUrl: documentUrl,
            fileName: fileName,
            fileSize: buffer.byteLength,
            filePath: filePath,
            transferId: id
          }),
        });

        if (result.ok) {
          const data = await result.json();
          console.log('Document created successfully:', data);
          if (data.document && data.document.url) {
            documentUrl = data.document.url;
          }
        } else {
          console.error('Failed to create document:', await result.text());
        }
      } catch (docError) {
        console.error('Error creating document record:', docError);
      }
    } catch (error) {
      console.error('Error generating approval document:', error);
      // Continue even if document generation fails
    }

    // Send notification to requester only (user-specific, not role-based)
    if (transfer.requesterId && transfer.asset?.name) {
      const session = await getServerSession(authOptions);
      await sendNotification({
        userId: transfer.requesterId, // Specific user ID who requested the transfer
        message: `Your transfer request for asset "${transfer.asset.name}" has been approved by ${session?.user?.name || 'a manager'}.${documentUrl ? ' An approval document is available for download.' : ''}`,
        type: 'transfer_approved',
        meta: {
          assetId: transfer.asset.id,
          transferId: transfer.id,
          documentUrl: documentUrl || null
        },
      });
      console.log(`Sent approval notification to user ${transfer.requesterId}`);
    }
    return NextResponse.json({ transfer, updatedAsset });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to approve transfer' },
      { status: 500 }
    );
  }
}

// PUT /api/transfers/[id]/approve
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the transfer request
    const transfer = await prisma.transfer.findUnique({
      where: { id: params.id },
      include: { asset: true }
    });

    if (!transfer) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    // Update the transfer status
    const updatedTransfer = await prisma.transfer.update({
      where: { id: params.id },
      data: { status: 'COMPLETED' },
      include: { asset: true }
    });

    // Update the asset's department and location
    const updatedAsset = await prisma.asset.update({
      where: { id: transfer.assetId },
      data: {
        department: transfer.toDepartment,
        location: transfer.toDepartment, // Assuming location changes with department
      }
    });

    // Track the changes in asset history
    try {
      // Create department history
      await prisma.assetHistory.create({
        data: {
          assetId: transfer.assetId,
          field: 'department',
          oldValue: transfer.fromDepartment,
          newValue: transfer.toDepartment,
          changedBy: session.user?.email || 'system',
        }
      });

      // Create location history
      await prisma.assetHistory.create({
        data: {
          assetId: transfer.assetId,
          field: 'location',
          oldValue: transfer.fromDepartment, // Use fromDepartment as oldValue
          newValue: transfer.toDepartment,   // Use toDepartment as newValue
          changedBy: session.user?.email || 'system',
        }
      });
    } catch (historyError) {
      console.error('Asset history logging failed:', historyError);
      // Continue without throwing
    }

    // Generate approval document
    let documentUrl = '';
    try {
      // Generate the document - use absolute URL with host
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 3000}`;
      const documentResponse = await fetch(`${baseUrl}/api/transfers/${params.id}/document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ managerReason: '' }),
      });

      if (documentResponse.ok) {
        const documentData = await documentResponse.json();
        documentUrl = documentData.document.url;
      }
    } catch (error) {
      console.error('Error generating approval document:', error);
      // Continue even if document generation fails
    }

    // Send notification to requester
    if (transfer.requesterId && transfer.asset?.name) {
      await sendNotification({
        userId: transfer.requesterId,
        message: `Your transfer request for asset "${transfer.asset.name}" has been completed.${documentUrl ? ' An approval document is available for download.' : ''}`,
        type: 'transfer_completed',
        meta: {
          assetId: transfer.asset.id,
          transferId: transfer.id,
          documentUrl: documentUrl || null
        },
      });
    }
    return NextResponse.json(updatedTransfer);
  } catch (error) {
    console.error('Error approving transfer:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
