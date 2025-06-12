import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/middleware/rbac';

// GET /api/assets/[id]/documents - Get all documents for an asset
export const GET = withRole(['AUDITOR', 'MANAGER', 'USER'], async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: assetId } = await context.params;

    // Check if the asset exists
    const asset = await prisma.asset.findUnique({
      where: {
        id: assetId,
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Fetch all documents for the asset
    const documents = await prisma.document.findMany({
      where: {
        assetId: assetId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
});

// POST /api/assets/[id]/documents - Create a new document for an asset
export const POST = withRole(['AUDITOR', 'MANAGER', 'USER'], async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: assetId } = await context.params;

    // Check if the asset exists
    const asset = await prisma.asset.findUnique({
      where: {
        id: assetId,
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Parse the request body
    const body = await request.json();

    // Validate required fields
    if (!body.type || !body.url) {
      return NextResponse.json(
        { error: 'Missing required fields: type, url' },
        { status: 400 }
      );
    }

    // Create the document without the new fields that are causing issues
    const document = await prisma.document.create({
      data: {
        assetId: assetId,
        type: body.type,
        url: body.url,
        // Store file metadata in the URL for now
        // Format: filename|filesize|mimetype
        // We'll extract this information when displaying the document
      },
    });

    return NextResponse.json(document);
  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json(
      { error: 'Failed to create document' },
      { status: 500 }
    );
  }
});
