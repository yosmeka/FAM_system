import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/middleware/rbac';

export const GET = withRole(['MANAGER', 'USER','AUDITOR'], async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  const { id } = await context.params;
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    return NextResponse.json(asset);
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error fetching asset:', error.message);
    } else {
      console.error('Unknown error fetching asset:', error);
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});

export const PUT = withRole(['MANAGER', 'USER','AUDITOR'], async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has 'Asset edit' permission (user-specific or role-based)
    const { id: userId, role } = session.user;
    const { hasPermission } = await import('@/app/api/users/[id]/route');
    const permitted = await hasPermission({ id: userId, role }, 'Asset edit');
    if (!permitted) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    // First get the current asset to compare changes
    const currentAsset = await prisma.asset.findUnique({
      where: { id: id }
    });

    if (!currentAsset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Prepare data for update, handling potential invalid values from frontend
    const updateData: Record<string, any> = {
      name: body.name,
      serialNumber: body.serialNumber,
      status: body.status,
      location: body.location,
      department: "Zemen Bank", // Always set to Zemen Bank regardless of form input
      category: body.category,
      type: body.type,
      supplier: body.supplier,
      description: body.description,
    };

    // Handle number fields, converting to float and checking for NaN
    const numberFields = ['purchasePrice', 'currentValue', 'depreciableCost', 'salvageValue', 'usefulLifeMonths'];
    numberFields.forEach(field => {
      const value = parseFloat(body[field]);
      if (!isNaN(value)) {
        updateData[field] = value;
      } else if (field === 'purchasePrice') {
        // purchasePrice is required, throw error if invalid
        console.error(`Invalid number format for required field: ${field}`, body[field]);
        throw new Error(`Invalid number format for ${field}`);
      } else {
        // For optional fields, set to null if invalid
        updateData[field] = null;
      }
    });

    // Handle date fields, converting to Date and checking for Invalid Date
    const dateFields = ['purchaseDate', 'warrantyExpiry', 'lastMaintenance', 'nextMaintenance', 'depreciationStartDate'];
    dateFields.forEach(field => {
      if (body[field]) {
        const date = new Date(body[field]);
        if (!isNaN(date.getTime())) {
          updateData[field] = date;
        } else if (field === 'purchaseDate') {
          // purchaseDate is required, throw error if invalid
          console.error(`Invalid date format for required field: ${field}`, body[field]);
          throw new Error(`Invalid date format for ${field}`);
        } else {
          // For optional fields, set to null if invalid
          updateData[field] = null;
        }
      } else if (field === 'purchaseDate') {
        // purchaseDate is required, throw error if missing
        console.error(`Missing required date field: ${field}`);
        throw new Error(`Missing required date field: ${field}`);
      } else {
        // For optional fields, set to null if missing
        updateData[field] = null;
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
      try {
        // Ensure the model name is correct based on your schema
        const result = await (prisma as any).assetHistory.createMany({
          data: changes,
        });
        console.log('History records created:', result);
      } catch (error) {
        console.error('Error creating history records:', error);
        // Decide if history saving failure should prevent asset update success
        // Currently, it just logs an error.
      }
    }

    return NextResponse.json(updatedAsset);
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error updating asset:', error.message);
      // Return a more specific error response for invalid data
      if (error.message.startsWith('Invalid number format') || error.message.startsWith('Invalid date format') || error.message.startsWith('Missing required date field')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    } else {
      console.error('Unknown error updating asset:', error);
    }
    // Check for Prisma unique constraint error (P2002)
    if (error && typeof error === 'object' && 'code' in error && (error as any).code === 'P2002') {
      // This block seems to be duplicated, the one below is more detailed.
      // Keep the more detailed handling below.
    }

    // More detailed handling for Prisma unique constraint error (P2002)
    if (error && typeof error === 'object' && 'code' in error && (error as any).code === 'P2002') {
      // Assuming the unique constraint is on the serialNumber field
      return NextResponse.json({
        error: 'Serial number must be unique',
        code: 'P2002',
        field: 'serialNumber',
        message: 'This serial number is already in use. Please enter a unique serial number.',
      }, { status: 409 }); // Use 409 Conflict for unique constraint errors
    }

    return NextResponse.json({ error: 'Failed to update asset' }, { status: 500 });
  }
});

export const DELETE = withRole(['MANAGER','USER','AUDITOR'], async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First check if the asset exists
    const asset = await prisma.asset.findUnique({
      where: { id: id }
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // First delete all related records manually to avoid foreign key constraint issues
    console.log(`Deleting all related records for asset ${id}`);

    // Delete asset depreciations
    await prisma.assetDepreciation.deleteMany({
      where: { assetId: id }
    });

    // Delete depreciation records
    await prisma.depreciation.deleteMany({
      where: { assetId: id }
    });

    // Delete linked assets (both directions)
    await prisma.linkedAsset.deleteMany({
      where: {
        OR: [
          { fromAssetId: id },
          { toAssetId: id }
        ]
      }
    });

    // Delete history records
    await prisma.assetHistory.deleteMany({
      where: { assetId: id }
    });

    // Delete maintenance records
    await prisma.maintenance.deleteMany({
      where: { assetId: id }
    });

    // Delete transfer records
    await prisma.transfer.deleteMany({
      where: { assetId: id }
    });

    // Delete disposal records
    await prisma.disposal.deleteMany({
      where: { assetId: id }
    });

    // Delete document records
    await prisma.document.deleteMany({
      where: { assetId: id }
    });

    // Finally delete the asset itself
    await prisma.asset.delete({
      where: {
        id: id,
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error deleting asset:', error.message);
    } else {
      console.error('Unknown error deleting asset:', error);
    }

    // Check for specific Prisma errors
    if (error && typeof error === 'object' && 'code' in error && (error as any).code === 'P2003') {
      return NextResponse.json(
        {
          error: 'Failed to delete asset',
          code: 'P2003',
          details: 'This asset has related records that need to be deleted first. Please contact support.',
          technicalDetails: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to delete asset',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      },
      { status: 500 }
    );
  }
}
)