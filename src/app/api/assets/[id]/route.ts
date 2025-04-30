import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const asset = await prisma.asset.findUnique({
      where: {
        id: params.id,
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    return NextResponse.json(asset);
  } catch (error) {
    console.error('Error fetching asset:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // First get the current asset to compare changes
    const currentAsset = await prisma.asset.findUnique({
      where: { id: params.id }
    });

    if (!currentAsset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Update the asset
    const updatedAsset = await prisma.asset.update({
      where: {
        id: params.id,
      },
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

    // Track changes in asset history
    const changes = [];
    const fields = [
      'name', 'serialNumber', 'purchaseDate', 'purchasePrice', 'currentValue',
      'status', 'location', 'department', 'category', 'supplier', 'description',
      'warrantyExpiry', 'lastMaintenance', 'nextMaintenance'
    ];

    console.log('Current asset:', currentAsset);
    console.log('Updated asset:', updatedAsset);

    for (const field of fields) {
      const oldValue = currentAsset[field];
      const newValue = updatedAsset[field];
      
      console.log(`Field: ${field}, Old: ${oldValue}, New: ${newValue}`);
      
      if (oldValue?.toString() !== newValue?.toString()) {
        changes.push({
          assetId: params.id,
          field,
          oldValue: oldValue?.toString() || null,
          newValue: newValue?.toString() || null,
          changedBy: session.user?.name || 'system',
        });
      }
    }

    console.log('Changes to be recorded:', changes);

    if (changes.length > 0) {
      try {
        const result = await prisma.assetHistory.createMany({
          data: changes,
        });
        console.log('History records created:', result);
      } catch (error) {
        console.error('Error creating history records:', error);
      }
    }

    return NextResponse.json(updatedAsset);
  } catch (error) {
    console.error('Error updating asset:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First check if the asset exists
    const asset = await prisma.asset.findUnique({
      where: { id: params.id }
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Delete the asset (cascade will handle related records)
    await prisma.asset.delete({
      where: {
        id: params.id,
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting asset:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete asset',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
} 