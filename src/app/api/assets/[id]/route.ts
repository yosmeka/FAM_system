import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/middleware/rbac';
import { Role } from '@prisma/client';

export const GET = withRole(['MANAGER', 'USER', 'AUDITOR'], async function GET(
  req: Request,
  ...args: unknown[]
) {
  const { params } = (args[0] || {}) as { params: Promise<{ id: string }> };
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First, clean up any self-referencing links
    await cleanupSelfReferencingLinks(id);

    // Fetch the asset with its linked assets
    const asset = await prisma.asset.findUnique({
      where: {
        id: id,
      },
      include: {
        linkedTo: {
          include: {
            toAsset: true
          }
        },
        linkedFrom: {
          include: {
            fromAsset: true
          }
        }
      }
    });

    console.log("API DEBUGGING - GET ASSET");
    console.log("Asset ID:", id);
    console.log("Asset found:", !!asset);
    if (asset) {
      console.log("LinkedTo count:", asset.linkedTo?.length || 0);
      console.log("LinkedFrom count:", asset.linkedFrom?.length || 0);

      // Check if linkedTo has the expected structure
      if (asset.linkedTo && asset.linkedTo.length > 0) {
        console.log("First linkedTo item:", JSON.stringify(asset.linkedTo[0]));
      }

      // Check if linkedFrom has the expected structure
      if (asset.linkedFrom && asset.linkedFrom.length > 0) {
        console.log("First linkedFrom item:", JSON.stringify(asset.linkedFrom[0]));
      }
    }

    console.log("API GET asset data:", asset);
    console.log("API GET linkedTo:", asset?.linkedTo);
    console.log("API GET linkedTo length:", asset?.linkedTo?.length || 0);

    // Check if there are any linked assets in the database
    const linkedAssetsCount = await prisma.linkedAsset.count({
      where: {
        fromAssetId: id
      }
    });

    console.log("Direct DB query linkedAssets count:", linkedAssetsCount);

    // Helper function to clean up self-referencing links
    async function cleanupSelfReferencingLinks(assetId: string) {
      try {
        // Find any self-referencing links
        const selfLinks = await prisma.linkedAsset.findMany({
          where: {
            AND: [
              { fromAssetId: assetId },
              { toAssetId: assetId }
            ]
          }
        });

        if (selfLinks.length > 0) {
          console.log(`Found ${selfLinks.length} self-referencing links for asset ${assetId}. Cleaning up...`);

          // Delete all self-referencing links
          await prisma.linkedAsset.deleteMany({
            where: {
              AND: [
                { fromAssetId: assetId },
                { toAssetId: assetId }
              ]
            }
          });

          console.log(`Successfully deleted ${selfLinks.length} self-referencing links.`);
        }
      } catch (error) {
        console.error("Error cleaning up self-referencing links:", error);
      }
    }

    if (!asset) {
      return Response.json({ error: 'Asset not found' }, { status: 404 });
    }

    return Response.json(asset);
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error fetching asset:', error.message);
    } else {
      console.error('Unknown error fetching asset:', error);
    }
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});

export const PUT = withRole(['MANAGER', 'USER', 'AUDITOR'], async function PUT(
  req: Request,
  ...args: unknown[]
) {
  const { params } = (args[0] || {}) as { params: Promise<{ id: string }> };
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has 'Asset edit' permission (user-specific or role-based)
    const { id: userId, role } = session.user;
    const { hasPermission } = await import('@/lib/permissions');
    const permitted = await hasPermission({ id: userId, role: role as Role }, 'Asset edit');
    if (!permitted) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();

    // First get the current asset to compare changes
    const currentAsset = await prisma.asset.findUnique({
      where: { id: id }
    });

    if (!currentAsset) {
      return Response.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Prepare data for update, handling potential invalid values from frontend
    const updateData: Record<string, unknown> = {
      name: body.name,
      serialNumber: body.serialNumber,
      status: body.status,
      department: "Zemen Bank",
    };

    // Handle optional string fields
    const optionalStringFields = ['location', 'category', 'supplier', 'description'];
    optionalStringFields.forEach(field => {
      updateData[field] = body[field] || null;
    });

    // Handle type field based on category
    updateData.type = body.category === 'LAND' ? null : body.type;

    // Handle string fields
    const stringFields = ['name', 'description', 'serialNumber', 'status', 'location', 'department', 'category', 'supplier'];
    stringFields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field] = body[field] || null;
      }
    });

    // Handle number fields
    const numberFields = ['purchasePrice', 'currentValue', 'depreciableCost', 'usefulLifeMonths', 'salvageValue'];
    numberFields.forEach(field => {
      if (body[field] !== undefined) {
        const value = parseFloat(body[field]);
        if (!isNaN(value)) {
          updateData[field] = value;
        } else {
          updateData[field] = null;
        }
      }
    });

    // Handle date fields
    const dateFields = ['purchaseDate', 'warrantyExpiry', 'lastMaintenance', 'nextMaintenance', 'depreciationStartDate'];
    dateFields.forEach(field => {
      if (body[field] !== undefined) {
        if (body[field]) {
          const date = new Date(body[field]);
          if (!isNaN(date.getTime())) {
            updateData[field] = date;
          } else {
            updateData[field] = null;
          }
        } else {
          updateData[field] = null;
        }
      }
    });

    // Update the asset
    const updatedAsset = await prisma.asset.update({
      where: {
        id: id,
      },
      data: updateData,
    });

    // Track changes in asset history
    const changes = [];
    // Use the keys from updateData to track changes more accurately
    const fieldsToTrack = Object.keys(updateData);

    console.log('Current asset:', currentAsset);
    console.log('Updated asset:', updatedAsset);

    for (const field of fieldsToTrack) {
      // Ensure the field exists on both objects before comparing
      if (Object.prototype.hasOwnProperty.call(currentAsset, field) && Object.prototype.hasOwnProperty.call(updatedAsset, field)) {
        const oldValue = currentAsset[field as keyof typeof currentAsset];
        const newValue = updatedAsset[field as keyof typeof updatedAsset];

        // Compare values, handling dates and potential nulls/undefineds carefully
        let areDifferent = false;

        if (oldValue instanceof Date && newValue instanceof Date) {
          areDifferent = oldValue.getTime() !== newValue.getTime();
        } else if (oldValue !== newValue) {
          // Handle null vs undefined, and other value types
          areDifferent = true;
        }

        console.log(`Field: ${field}, Old: ${oldValue}, New: ${newValue}, Different: ${areDifferent}`);

        if (areDifferent) {
          changes.push({
            assetId: id,
            field,
            oldValue: oldValue !== null && oldValue !== undefined ? String(oldValue) : null,
            newValue: newValue !== null && newValue !== undefined ? String(newValue) : null,
            changedBy: session.user?.name || 'system',
          });
        }
      }
    }

    console.log('Changes to be recorded:', changes);

    if (changes.length > 0) {
      console.log('Creating history records:', changes);
      try {
        // Create history records one by one to avoid potential issues with `createMany`
        for (const change of changes) {
          await prisma.assetHistory.create({ data: change as any });
        }
        console.log('History records created successfully');
      } catch (error) {
        console.error('Error creating history records:', error);
      }
    }

    return Response.json(updatedAsset);
  } catch (error: any) {
    if (error.code === 'P2002' && error.meta?.target?.includes('serialNumber')) {
      return Response.json(
        {
          error: 'Serial number already exists',
          field: 'serialNumber'
        },
        { status: 409 }
      );
    }
    console.error('Error updating asset:', error);
    return Response.json({
      error: error.message || 'Internal Server Error',
    }, { status: 500 });
  }
});

export const DELETE = withRole(['MANAGER', 'USER', 'AUDITOR'], async function DELETE(
  req: Request,
  ...args: unknown[]
) {
  const { params } = (args[0] || {}) as { params: Promise<{ id: string }> };
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission
    const { id: userId, role } = session.user;
    const { hasPermission } = await import('@/lib/permissions');
    const permitted = await hasPermission({ id: userId, role: role as Role }, 'Asset delete');

    if (!permitted) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if asset exists
    const asset = await prisma.asset.findUnique({
      where: { id: id },
      include: {
        // Include linked assets to check for relationships
        linkedTo: true,
        linkedFrom: true,
      }
    });

    if (!asset) {
      return Response.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Check for active audits by looking at the status of related audit assignments
    const activeAudits = await prisma.auditAssignment.count({
      where: {
        assetId: id,
        status: {
          in: ['PENDING', 'IN_PROGRESS', 'ACCEPTED']
        }
      }
    });

    if (activeAudits > 0) {
      return Response.json(
        { error: 'Cannot delete asset with active audits' },
        { status: 400 }
      );
    }

    // Clean up all linked asset records associated with this asset
    await prisma.linkedAsset.deleteMany({
      where: {
        OR: [
          { fromAssetId: id },
          { toAssetId: id },
        ],
      },
    });

    // Clean up asset history
    await prisma.assetHistory.deleteMany({
      where: { assetId: id }
    });

    // Proceed to delete the asset
    await prisma.asset.delete({
      where: {
        id: id,
      },
    });

    return Response.json({ message: 'Asset deleted successfully' });
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error deleting asset:', error.message);
    } else {
      console.error('Unknown error deleting asset:', error);
    }
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});