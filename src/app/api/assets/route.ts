import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

import { withRole } from '@/middleware/rbac';

export const GET = withRole(['ADMIN', 'MANAGER', 'USER'], async function GET() {
  try {
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
});

export const POST = withRole(['ADMIN', 'MANAGER'], async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const asset = await prisma.asset.create({
      data: {
        name: body.name,
        description: body.description,
        serialNumber: body.serialNumber,
        purchaseDate: new Date(body.purchaseDate),
        purchasePrice: parseFloat(body.purchasePrice),
        currentValue: parseFloat(body.currentValue),
        status: body.status,
        location: body.location,
        department: body.department,
        category: body.category,
        supplier: body.supplier,
        warrantyExpiry: body.warrantyExpiry ? new Date(body.warrantyExpiry) : null,
        lastMaintenance: body.lastMaintenance ? new Date(body.lastMaintenance) : null,
        nextMaintenance: body.nextMaintenance ? new Date(body.nextMaintenance) : null,
      },
    });

    return NextResponse.json(asset);
  } catch (error) {
    console.error('Error creating asset:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});