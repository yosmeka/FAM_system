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
        supplier: body.supplier,
        description: body.description,
        warrantyExpiry: body.warrantyExpiry ? new Date(body.warrantyExpiry) : null,
        lastMaintenance: body.lastMaintenance ? new Date(body.lastMaintenance) : null,
        nextMaintenance: body.nextMaintenance ? new Date(body.nextMaintenance) : null,
      },
    });

    // Track initial asset creation in history
    const fields = [
      'name', 'serialNumber', 'purchaseDate', 'purchasePrice', 'currentValue',
      'status', 'location', 'department', 'category', 'supplier', 'description',
      'warrantyExpiry', 'lastMaintenance', 'nextMaintenance'
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
  } catch (error) {
    console.error('Error creating asset:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 