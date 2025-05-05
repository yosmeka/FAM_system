import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    return NextResponse.json(assets);
  } catch (error) {
    console.error('Error fetching assets:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    console.log("Creating asset with data:", body);

    // Create the asset
    const asset = await prisma.asset.create({
      data: {
        name: body.name,
        serialNumber: body.serialNumber,
        purchaseDate: new Date(body.purchaseDate),
        purchasePrice: parseFloat(body.purchasePrice),
        currentValue: parseFloat(body.currentValue),
        status: body.status,
        location: body.location,
        department: body.department,
        category: body.category,
        type: body.type,
        supplier: body.supplier,
        description: body.description,
        warrantyExpiry: body.warrantyExpiry ? new Date(body.warrantyExpiry) : null,
        lastMaintenance: body.lastMaintenance ? new Date(body.lastMaintenance) : null,
        nextMaintenance: body.nextMaintenance ? new Date(body.nextMaintenance) : null,
        // Depreciation fields
        depreciableCost: body.depreciableCost ? parseFloat(body.depreciableCost) : null,
        salvageValue: body.salvageValue ? parseFloat(body.salvageValue) : null,
        usefulLifeMonths: body.usefulLifeMonths ? parseInt(body.usefulLifeMonths) : null,
        depreciationMethod: body.depreciationMethod || null,
        depreciationStartDate: body.depreciationStartDate ? new Date(body.depreciationStartDate) : null,
      },
    });

    // Track initial asset creation in history
    const fields = [
      'name', 'serialNumber', 'purchaseDate', 'purchasePrice', 'currentValue',
      'status', 'location', 'department', 'category', 'type', 'supplier', 'description',
      'warrantyExpiry', 'lastMaintenance', 'nextMaintenance', 'depreciableCost',
      'salvageValue', 'usefulLifeMonths', 'depreciationMethod', 'depreciationStartDate'
    ];

    console.log('New asset created:', asset);

    const changes = fields.map(field => ({
      assetId: asset.id,
      field,
      oldValue: null,
      newValue: asset[field]?.toString() || null,
      changedBy: session.user?.email || 'system',
    }));

    console.log('Initial history records to be created:', changes);

    try {
      const result = await prisma.assetHistory.createMany({
        data: changes,
      });
      console.log('Initial history records created:', result);
    } catch (error) {
      console.error('Error creating initial history records:', error);
    }

    return NextResponse.json(asset);
  } catch (error: any) {
    console.error('Error creating asset:', error);

    // Check for Prisma unique constraint error
    if (error.code === 'P2002' && error.meta?.target?.includes('serialNumber')) {
      return NextResponse.json(
        {
          error: 'Serial number already exists',
          code: 'P2002',
          field: 'serialNumber',
          message: 'An asset with this serial number already exists in the system.'
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      error: error.message || 'Internal Server Error',
      code: error.code
    }, { status: 500 });
  }
}