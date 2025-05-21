import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/middleware/rbac';
import { sendNotification } from '@/lib/notifications';

// PUT /api/maintenance/[id]/approve
export const PUT = withRole(['ADMIN', 'MANAGER'], async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { status, notes, scheduledDate } = body;

    console.log('Approval request body:', body);

    // Validate the status
    if (status !== 'APPROVED' && status !== 'REJECTED') {
      return NextResponse.json(
        { error: 'Invalid status. Must be APPROVED or REJECTED' },
        { status: 400 }
      );
    }

    // Get the maintenance request
    const maintenance = await prisma.maintenance.findUnique({
      where: { id: params.id },
      include: { asset: true }
    });

    if (!maintenance) {
      return NextResponse.json({ error: 'Maintenance request not found' }, { status: 404 });
    }

    // Check if the maintenance request is in the correct state
    if (maintenance.status !== 'PENDING_APPROVAL') {
      return NextResponse.json(
        { error: 'Maintenance request is not in PENDING_APPROVAL state' },
        { status: 400 }
      );
    }

    // Update the maintenance request
    const updateData: any = {
      status,
      notes,
    };

    // If approved, set the scheduled date
    if (status === 'APPROVED' && scheduledDate) {
      updateData.scheduledDate = new Date(scheduledDate);
    }

    console.log('Updating maintenance with data:', updateData);

    const updatedMaintenance = await prisma.maintenance.update({
      where: { id: params.id },
      data: updateData,
      include: {
        asset: true,
        requester: {
          select: {
            name: true,
            email: true,
          }
        },
        manager: {
          select: {
            name: true,
            email: true,
          }
        }
      }
    });

    console.log('Updated maintenance:', updatedMaintenance);

    // If approved, update the asset's next maintenance date
    if (status === 'APPROVED' && scheduledDate) {
      await prisma.asset.update({
        where: { id: maintenance.assetId },
        data: {
          nextMaintenance: new Date(scheduledDate),
        },
      });

      // Track the changes in asset history
      await prisma.assetHistory.create({
        data: {
          assetId: maintenance.assetId,
          field: 'nextMaintenance',
          oldValue: maintenance.asset.nextMaintenance?.toISOString() || null,
          newValue: new Date(scheduledDate).toISOString(),
          changedBy: session.user?.email || 'system',
        }
      });
    }

    // Generate approval/rejection document
    let documentUrl = '';
    try {
      console.log(`Generating document for maintenance request ${params.id} with status ${status}`);

      // Generate the document - use absolute URL with host
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 3000}`;
      const documentResponse = await fetch(`${baseUrl}/api/maintenance/${params.id}/document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ managerNotes: notes }),
      });

      if (documentResponse.ok) {
        const documentData = await documentResponse.json();
        documentUrl = documentData.document.url;
        console.log(`Generated document URL: ${documentUrl}`);

        // Verify the document was created in the database
        const document = await prisma.document.findFirst({
          where: {
            url: documentUrl,
          },
        });

        if (document) {
          console.log(`Verified document in database:`, {
            id: document.id,
            type: document.type,
            url: document.url,
            meta: document.meta
          });
        } else {
          console.error(`Document not found in database after generation`);
        }
      } else {
        const errorText = await documentResponse.text();
        console.error('Error generating document:', errorText);
      }
    } catch (error) {
      console.error('Error generating document:', error);
      // Continue even if document generation fails
    }

    // Create a notification for the requester
    if (updatedMaintenance.requesterId) {
      try {
        const assetName = updatedMaintenance.asset?.name || 'Unknown asset';
        const managerName = session?.user?.name || 'A manager';

        // Create notification message based on status
        let message = '';
        if (status === 'APPROVED') {
          message = `Your maintenance request for "${assetName}" has been approved by ${managerName}.`;
          if (scheduledDate) {
            message += ` It has been scheduled for ${new Date(scheduledDate).toLocaleDateString()}.`;
          }
        } else {
          message = `Your maintenance request for "${assetName}" has been rejected by ${managerName}.`;
          if (notes) {
            message += ` Reason: ${notes.substring(0, 100)}${notes.length > 100 ? '...' : ''}`;
          }
        }

        // Add document info if available
        if (documentUrl) {
          message += ' A document is available for download.';
        }

        await sendNotification({
          userId: updatedMaintenance.requesterId,
          message,
          type: status === 'APPROVED' ? 'maintenance_approved' : 'maintenance_rejected',
          meta: {
            assetId: updatedMaintenance.assetId,
            maintenanceId: updatedMaintenance.id,
            documentUrl: documentUrl || null,
            notes: notes || null
          },
        });

        console.log(`Sent ${status.toLowerCase()} notification to user ${updatedMaintenance.requesterId}`);
      } catch (notificationError) {
        console.error('Error sending notification:', notificationError);
        // Continue even if notification fails
      }
    }

    return NextResponse.json({
      ...updatedMaintenance,
      documentUrl
    });
  } catch (error) {
    console.error('Error approving/rejecting maintenance request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
