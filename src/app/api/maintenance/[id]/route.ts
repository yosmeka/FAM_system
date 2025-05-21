import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/maintenance/[id]
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const maintenanceRequest = await prisma.maintenance.findUnique({
      where: { id: params.id },
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            serialNumber: true,
          },
        },
        requester: {
          select: {
            name: true,
            email: true,
          },
        },
        manager: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!maintenanceRequest) {
      return NextResponse.json(
        { error: 'Maintenance request not found' },
        { status: 404 }
      );
    }

    // Check for associated document if the request is approved or rejected
    let documentUrl = null;
    if (maintenanceRequest.status === 'APPROVED' || maintenanceRequest.status === 'REJECTED') {
      try {
        console.log(`Checking for document for maintenance ${params.id} with status ${maintenanceRequest.status}`);

        // Find documents for this maintenance request
        const documents = await prisma.document.findMany({
          where: {
            assetId: maintenanceRequest.assetId,
          },
        });

        console.log(`Found ${documents.length} documents for asset ${maintenanceRequest.assetId}`);

        // Log all documents for debugging
        documents.forEach((doc, index) => {
          console.log(`Document ${index + 1}:`, {
            id: doc.id,
            type: doc.type,
            url: doc.url,
            meta: doc.meta
          });
        });

        // Find the document related to this maintenance request
        const maintenanceDocument = documents.find(
          (doc) =>
            doc.meta &&
            typeof doc.meta === 'object' &&
            'maintenanceId' in doc.meta &&
            doc.meta.maintenanceId === params.id
        );

        if (maintenanceDocument) {
          documentUrl = maintenanceDocument.url;
          console.log(`Found document for maintenance ${params.id}:`, maintenanceDocument.url);
        } else {
          console.log(`No document found for maintenance ${params.id}`);

          // Try a different approach - look for documents by type
          const typeDocument = documents.find(
            (doc) =>
              (doc.type === 'MAINTENANCE_APPROVAL' || doc.type === 'MAINTENANCE_REJECTION') &&
              doc.meta &&
              typeof doc.meta === 'object'
          );

          if (typeDocument) {
            documentUrl = typeDocument.url;
            console.log(`Found document by type for maintenance ${params.id}:`, typeDocument.url);
          }
        }
      } catch (error) {
        console.error(`Error fetching document for maintenance ${params.id}:`, error);
      }
    }

    return NextResponse.json({
      ...maintenanceRequest,
      documentUrl
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch maintenance request' },
      { status: 500 }
    );
  }
}

// PUT /api/maintenance/[id]
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      status,
      description,
      priority,
      notes,
      scheduledDate,
      managerId
    } = body;

    // Get the current maintenance request to check its status and requester
    const currentRequest = await prisma.maintenance.findUnique({
      where: { id: params.id },
      select: {
        status: true,
        requesterId: true
      }
    });

    if (!currentRequest) {
      return NextResponse.json(
        { error: 'Maintenance request not found' },
        { status: 404 }
      );
    }

    // Get the current session to check user role
    const session = await getServerSession();
    const userId = session?.user?.id;
    const userRole = session?.user?.role;

    // Check if the user is the requester and trying to change status from PENDING_APPROVAL
    const isRequester = userId === currentRequest.requesterId;
    const isPendingApproval = currentRequest.status === 'PENDING_APPROVAL';

    // If regular user is trying to change status of a pending request, prevent it
    if (isRequester && isPendingApproval && status !== undefined && status !== 'PENDING_APPROVAL' && userRole === 'USER') {
      return NextResponse.json(
        { error: 'Regular users cannot change the status of a pending request' },
        { status: 403 }
      );
    }

    // Build the update data object
    const updateData: any = {};

    // Only update fields that are provided
    if (description !== undefined) updateData.description = description;
    if (priority !== undefined) updateData.priority = priority;
    if (notes !== undefined) updateData.notes = notes;
    if (scheduledDate !== undefined) updateData.scheduledDate = new Date(scheduledDate);
    if (managerId !== undefined) updateData.managerId = managerId || null; // Allow unsetting manager with empty string

    // Handle status changes
    if (status !== undefined) {
      updateData.status = status;

      // Set completedAt when status changes to COMPLETED
      if (status === 'COMPLETED') {
        updateData.completedAt = new Date();
      }
    }

    const maintenanceRequest = await prisma.maintenance.update({
      where: { id: params.id },
      data: updateData,
      include: {
        asset: {
          select: {
            name: true,
            serialNumber: true,
          },
        },
        requester: {
          select: {
            name: true,
            email: true,
          },
        },
        manager: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // If the maintenance is completed, update the asset's lastMaintenance and nextMaintenance dates
    if (status === 'COMPLETED') {
      const nextMaintenanceDate = new Date();
      nextMaintenanceDate.setMonth(nextMaintenanceDate.getMonth() + 3); // Schedule next maintenance in 3 months

      await prisma.asset.update({
        where: { id: maintenanceRequest.assetId },
        data: {
          lastMaintenance: new Date(),
          nextMaintenance: nextMaintenanceDate,
        },
      });
    }

    return NextResponse.json(maintenanceRequest);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to update maintenance request' },
      { status: 500 }
    );
  }
}

// DELETE /api/maintenance/[id]
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get session for authentication
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the maintenance request exists
    const maintenanceRequest = await prisma.maintenance.findUnique({
      where: { id: params.id },
      include: {
        requester: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!maintenanceRequest) {
      return NextResponse.json({ error: 'Maintenance request not found' }, { status: 404 });
    }

    // Check if the user is authorized to delete this request
    // Only the requester, managers, or admins can delete
    const userId = session.user?.id;
    const userRole = session.user?.role;

    const isRequester = userId === maintenanceRequest.requester?.id;
    const isManagerOrAdmin = userRole === 'MANAGER' || userRole === 'ADMIN';

    if (!isRequester && !isManagerOrAdmin) {
      return NextResponse.json({ error: 'Not authorized to delete this maintenance request' }, { status: 403 });
    }

    // Delete the maintenance request
    await prisma.maintenance.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting maintenance request:', error);
    return NextResponse.json(
      { error: 'Failed to delete maintenance request' },
      { status: 500 }
    );
  }
}