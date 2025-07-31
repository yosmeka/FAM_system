import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/middleware/rbac';
import { withPermission } from '@/middleware/permission';

export const GET = withRole(['MANAGER', 'USER','AUDITOR'], async function GET() {
  try {
    const assets = await prisma.asset.findMany({
      orderBy: {
        createdAt: 'desc',
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

    return Response.json(assets);
  } catch (error) {
    console.error('Error fetching assets:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});

export const POST = withPermission(async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    console.log("Creating asset with data:", body);

    // Validate unit price
    if (!body.unitPrice || body.unitPrice <= 0) {
      return Response.json(
        { error: 'Unit price must be a positive number greater than zero' },
        { status: 400 }
      );
    }

    // Create the asset
    const asset = await prisma.asset.create({
      data: {
        name: body.name,
        itemDescription: body.itemDescription,
        serialNumber: body.serialNumber,
        oldTagNumber: body.oldTagNumber,
        newTagNumber: body.newTagNumber,
        grnNumber: body.grnNumber,
        grnDate: body.grnDate ? new Date(body.grnDate) : null,
        unitPrice: body.unitPrice,
        sivNumber: body.sivNumber,
        sivDate: body.sivDate ? new Date(body.sivDate) : null,
        currentDepartment: body.currentDepartment,
        remark: body.remark,
        usefulLifeYears: body.usefulLifeYears,
        residualPercentage: body.residualPercentage,
        currentValue: body.currentValue ?? body.unitPrice ?? 0,
        status: body.status,
        location: body.location,
        category: body.category,
        supplier: body.supplier,
        warrantyExpiry: body.warrantyExpiry ? new Date(body.warrantyExpiry) : null,
        lastMaintenance: body.lastMaintenance ? new Date(body.lastMaintenance) : null,
        nextMaintenance: body.nextMaintenance ? new Date(body.nextMaintenance) : null,
        salvageValue: body.salvageValue,
        depreciationMethod: body.depreciationMethod,
        // depreciationStartDate removed - using sivDate only
      },
    });

    // Note: DepreciationSchedule table has been removed from schema
    // Depreciation is now calculated on-the-fly using calculateMonthlyDepreciation()
    // This eliminates precision issues and improves performance

    // Track initial asset creation in history
    const fields = [
      'name', 'itemDescription', 'serialNumber', 'oldTagNumber', 'newTagNumber', 'grnNumber', 'grnDate',
      'unitPrice', 'sivNumber', 'sivDate', 'currentDepartment', 'remark', 'usefulLifeYears', 'residualPercentage',
      'currentValue', 'status', 'location', 'category', 'supplier', 'warrantyExpiry', 'lastMaintenance',
      'nextMaintenance', 'salvageValue', 'depreciationMethod', 'depreciationStartDate'
    ];

    console.log('New asset created:', asset);

    const changes = fields.map(field => ({
      assetId: asset.id,
      field,
      oldValue: null,
      newValue: (asset as any)[field]?.toString() || null,
      changedBy: session.user?.email || 'system',
    }));

    console.log('Initial history records to be created:', changes);

    try {
      // Create history records one by one instead of using createMany
      for (const change of changes) {
        await prisma.assetHistory.create({
          data: change
        });
      }
      console.log('Initial history records created successfully');
    } catch (error) {
      console.error('Error creating initial history records:', error);
    }

    return Response.json(asset);
  } catch (error: any) {
    console.error('Error creating asset:', error);

    // Check for Prisma unique constraint error
    if (error.code === 'P2002' && error.meta?.target?.includes('serialNumber')) {
      return Response.json(
        {
          error: 'Serial number already exists',
          code: 'P2002',
          field: 'serialNumber',
          message: 'An asset with this serial number already exists in the system.'
        },
        { status: 409 }
      );
    }

    return Response.json({
      error: error.message || 'Internal Server Error',
      code: error.code
    }, { status: 500 });
  }
}, 'Asset create');
