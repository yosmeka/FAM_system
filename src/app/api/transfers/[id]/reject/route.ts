import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendNotification } from '@/lib/notifications';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { mkdir } from 'fs/promises';

// POST /api/transfers/[id]/reject
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const body = await request.json();
    const reason = body.reason || '';
    const transfer = await prisma.transfer.update({
      where: { id },
      data: { status: 'REJECTED', managerReason: reason },
      include: { asset: true },
    });
    // Generate rejection document
    let documentUrl = '';
    try {
      console.log(`Directly generating rejection document for transfer ${id}`);

      // Import the document generation function
      const { generateTransferDocumentPdf } = await import('@/lib/generateTransferDocumentPdf');

      // Get the requester information
      const requester = await prisma.user.findUnique({
        where: { id: transfer.requesterId },
        select: { name: true, email: true }
      });

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
        status: 'REJECTED',
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
      const fileName = `transfer_rejection_${id}.pdf`;
      const filePath = join(uploadDir, fileName);
      await writeFile(filePath, buffer);

      // Create the document URL
      documentUrl = `/uploads/documents/${fileName}`;

      console.log(`Rejection document saved to ${filePath}`);

      // Use direct database connection to create document
      try {
        // Create the document record
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
          console.log('Rejection document created successfully:', data);
          if (data.document && data.document.url) {
            documentUrl = data.document.url;
          }
        } else {
          console.error('Failed to create rejection document:', await result.text());
        }
      } catch (docError) {
        console.error('Error creating rejection document record:', docError);
      }
    } catch (error) {
      console.error('Error generating rejection document:', error);
      // Continue even if document generation fails
    }

    // Send notification to requester only (user-specific, not role-based)
    if (transfer.requesterId && transfer.asset?.name) {
      await sendNotification({
        userId: transfer.requesterId, // Specific user ID who requested the transfer
        message: `Your transfer request for asset "${transfer.asset.name}" has been rejected by ${session?.user?.name || 'a manager'}.${documentUrl ? ' A rejection document is available for download.' : ''}`,
        type: 'transfer_rejected',
        meta: {
          assetId: transfer.asset.id,
          transferId: transfer.id,
          documentUrl: documentUrl || null,
          rejectionReason: reason || null
        },
      });
      console.log(`Sent rejection notification to user ${transfer.requesterId}`);
    }
    return NextResponse.json(transfer);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to reject transfer' },
      { status: 500 }
    );
  }
}
