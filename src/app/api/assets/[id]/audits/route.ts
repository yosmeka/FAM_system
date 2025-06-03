import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET all audits for an asset
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get session for authentication
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the asset exists
    const asset = await prisma.asset.findUnique({
      where: {
        id: params.id,
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Get all audits for the asset
    const audits = await prisma.assetAudit.findMany({
      where: {
        assetId: params.id,
      },
      orderBy: {
        auditDate: 'desc',
      },
    });

    return NextResponse.json(audits);
  } catch (error) {
    console.error('Error fetching asset audits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch asset audits' },
      { status: 500 }
    );
  }
}

// POST a new audit for an asset
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get session for authentication
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the asset exists
    const asset = await prisma.asset.findUnique({
      where: {
        id: params.id,
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Parse the request body
    const body = await request.json();

    // Validate required fields
    if (!body.auditDate || !body.condition) {
      return NextResponse.json(
        { error: 'Missing required fields: auditDate, condition' },
        { status: 400 }
      );
    }

    // Create the audit record
    const audit = await prisma.assetAudit.create({
      data: {
        assetId: params.id,
        auditDate: new Date(body.auditDate),
        auditedBy: session.user?.name || 'Unknown User',
        status: body.status || 'COMPLETED',
        condition: body.condition,
        locationVerified: body.locationVerified !== undefined ? body.locationVerified : true,
        notes: body.notes || null,
        discrepancies: body.discrepancies || null,
        discrepancyResolved: body.discrepancyResolved || false,
        resolvedDate: body.resolvedDate ? new Date(body.resolvedDate) : null,
        resolvedBy: body.resolvedBy || null,
        resolutionNotes: body.resolutionNotes || null,
        photoUrls: body.photoUrls || null,
        nextAuditDate: body.nextAuditDate ? new Date(body.nextAuditDate) : null,
      },
    });

    // Update the asset's last audit date and next audit date
    await prisma.asset.update({
      where: {
        id: params.id,
      },
      data: {
        lastAuditDate: new Date(body.auditDate),
        nextAuditDate: body.nextAuditDate ? new Date(body.nextAuditDate) : null,
      },
    });

    // Create an asset history record
    await prisma.assetHistory.create({
      data: {
        assetId: params.id,
        field: 'Audit',
        oldValue: asset.lastAuditDate ? asset.lastAuditDate.toISOString() : 'Never',
        newValue: new Date(body.auditDate).toISOString(),
        changedBy: session.user?.name || 'system',
      },
    });

    return NextResponse.json(audit, { status: 201 });
  } catch (error) {
    console.error('Error creating asset audit:', error);
    return NextResponse.json(
      { error: 'Failed to create asset audit', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
