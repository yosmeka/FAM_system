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

    // Check if serial number is being changed and if it's unique
    if (body.serialNumber && body.serialNumber.trim() !== '') {
      const trimmedSerial = body.serialNumber.trim();

      // Only check uniqueness if the serial number is actually different
      if (trimmedSerial !== currentAsset.serialNumber) {
        console.log(`🔍 Serial Number Check: Current='${currentAsset.serialNumber}', New='${trimmedSerial}'`);

        const existingAsset = await prisma.asset.findUnique({
          where: { serialNumber: trimmedSerial },
          select: { id: true, name: true, serialNumber: true }
        });

        if (existingAsset && existingAsset.id !== id) {
          console.log(`❌ Serial Number Conflict: Asset '${existingAsset.name}' (${existingAsset.id}) already has serial '${existingAsset.serialNumber}'`);
          return Response.json(
            {
              error: `Serial Number '${trimmedSerial}' already exists for asset '${existingAsset.name}'`,
              field: 'serialNumber',
              conflictingAsset: {
                id: existingAsset.id,
                name: existingAsset.name
              }
            },
            { status: 400 }
          );
        } else {
          console.log(`✅ Serial Number OK: '${trimmedSerial}' is unique`);
        }
      } else {
        console.log(`✅ Serial Number Unchanged: '${trimmedSerial}'`);
      }
    }

    // Prepare data for update, handling potential invalid values from frontend
    const updateData: Record<string, unknown> = {
      name: body.name,
      serialNumber: body.serialNumber,
      status: body.status,
      currentDepartment: body.currentDepartment || body.department || null,
    };

    // Handle optional string fields
    const optionalStringFields = ['location', 'category', 'supplier', 'description'];
    optionalStringFields.forEach(field => {
      updateData[field] = body[field] || null;
    });

    // Handle type field based on category
    updateData.type = body.category === 'LAND' ? null : body.type;

    // Handle string fields (using correct field names from Prisma schema)
    const stringFields = [
      'name', 'itemDescription', 'serialNumber', 'status', 'location', 'category', 'supplier', 'type',
      'oldTagNumber', 'newTagNumber', 'grnNumber', 'sivNumber', 'remark'
    ];
    stringFields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field] = body[field] || null;
      }
    });

    // Handle department field mapping (frontend might send 'department' but schema uses 'currentDepartment')
    if (body.department !== undefined) {
      updateData.currentDepartment = body.department || null;
    }
    if (body.currentDepartment !== undefined) {
      updateData.currentDepartment = body.currentDepartment || null;
    }

    // Handle description field mapping (frontend might send 'description' but schema uses 'itemDescription')
    if (body.description !== undefined) {
      updateData.itemDescription = body.description || null;
    }

    // Handle number fields (using correct schema field names)
    const numberFields = ['unitPrice', 'currentValue', 'depreciableCost', 'salvageValue', 'residualPercentage'];
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

    // Handle field mapping for number fields (frontend might send old field names)
    if (body.purchasePrice !== undefined) {
      const value = parseFloat(body.purchasePrice);
      updateData.unitPrice = !isNaN(value) ? value : null;
    }

    // Handle useful life field mapping (frontend might send usefulLifeMonths but schema uses usefulLifeYears)
    if (body.usefulLifeMonths !== undefined) {
      const months = parseFloat(body.usefulLifeMonths);
      updateData.usefulLifeYears = !isNaN(months) ? Math.round(months / 12) : null;
    }
    if (body.usefulLifeYears !== undefined) {
      const years = parseFloat(body.usefulLifeYears);
      updateData.usefulLifeYears = !isNaN(years) ? years : null;
    }

    // Handle date fields (using correct schema field names)
    const dateFields = ['sivDate', 'grnDate', 'warrantyExpiry', 'lastMaintenance', 'nextMaintenance', 'lastAuditDate', 'nextAuditDate'];
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

    // Handle date field mapping (frontend might send old field names)
    if (body.purchaseDate !== undefined) {
      if (body.purchaseDate) {
        const date = new Date(body.purchaseDate);
        updateData.sivDate = !isNaN(date.getTime()) ? date : null;
      } else {
        updateData.sivDate = null;
      }
    }

    if (body.depreciationStartDate !== undefined) {
      if (body.depreciationStartDate) {
        const date = new Date(body.depreciationStartDate);
        updateData.sivDate = !isNaN(date.getTime()) ? date : null;
      } else {
        updateData.sivDate = null;
      }
    }

    // Clean updateData: remove undefined values and invalid fields
    const cleanedUpdateData: Record<string, any> = {};
    Object.keys(updateData).forEach(key => {
      const value = updateData[key];
      // Only include defined values and exclude 'description' field
      if (value !== undefined && key !== 'description') {
        cleanedUpdateData[key] = value;
      }
    });

    console.log('🔧 Asset Update: Cleaned data for Prisma:', cleanedUpdateData);

    // Update the asset with enhanced error handling
    let updatedAsset;
    try {
      updatedAsset = await prisma.asset.update({
        where: {
          id: id,
        },
        data: cleanedUpdateData,
      });
      console.log('✅ Asset Update: Successfully updated asset', updatedAsset.id);
    } catch (prismaError: any) {
      console.error('❌ Prisma Update Error:', prismaError);

      // Handle specific Prisma errors
      if (prismaError.code === 'P2002') {
        // Unique constraint violation
        const field = prismaError.meta?.target?.[0] || 'unknown field';
        return Response.json(
          {
            error: `${field === 'serialNumber' ? 'Serial Number' : field} must be unique`,
            field: field,
            details: prismaError.message
          },
          { status: 400 }
        );
      }

      // Generic Prisma error
      return Response.json(
        {
          error: 'Failed to update asset',
          details: prismaError.message,
          type: 'PrismaError'
        },
        { status: 500 }
      );
    }

    // Note: DepreciationSchedule table has been removed from schema
    // Depreciation is now calculated on-the-fly using calculateMonthlyDepreciation()
    // This eliminates precision issues and improves performance

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