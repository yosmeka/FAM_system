import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/middleware/rbac';

// Helper function to extract IDs from URL
function extractIdsFromUrl(url: string) {
  const pathParts = url.split('/');
  const assetsIndex = pathParts.indexOf('assets');
  const documentsIndex = pathParts.indexOf('documents');

  if (assetsIndex === -1 || documentsIndex === -1) {
    return { assetId: null, documentId: null };
  }

  return {
    assetId: pathParts[assetsIndex + 1],
    documentId: pathParts[documentsIndex + 1]
  };
}

// GET /api/assets/[id]/documents/[documentId] - Get a specific document
export const GET = withRole(['ADMIN', 'MANAGER', 'USER'], async function GET(
  request: Request,
  { params }: { params: { id: string; documentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract IDs from URL
    const url = new URL(request.url);
    const { assetId, documentId } = extractIdsFromUrl(url.pathname);

    if (!assetId || !documentId) {
      return NextResponse.json({ error: 'Asset ID and Document ID are required' }, { status: 400 });
    }

    // Check if the document exists and belongs to the specified asset
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        assetId: assetId,
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document' },
      { status: 500 }
    );
  }
});

// PUT /api/assets/[id]/documents/[documentId] - Update a specific document
export const PUT = withRole(['ADMIN', 'MANAGER'], async function PUT(
  request: Request,
  { params }: { params: { id: string; documentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract IDs from URL
    const url = new URL(request.url);
    const { assetId, documentId } = extractIdsFromUrl(url.pathname);

    if (!assetId || !documentId) {
      return NextResponse.json({ error: 'Asset ID and Document ID are required' }, { status: 400 });
    }

    // Check if the document exists and belongs to the specified asset
    const existingDocument = await prisma.document.findFirst({
      where: {
        id: documentId,
        assetId: assetId,
      },
    });

    if (!existingDocument) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Parse the request body
    const body = await request.json();

    // Update the document
    const updatedDocument = await prisma.document.update({
      where: {
        id: documentId,
      },
      data: {
        type: body.type || existingDocument.type,
        url: body.url || existingDocument.url,
      },
    });

    return NextResponse.json(updatedDocument);
  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json(
      { error: 'Failed to update document' },
      { status: 500 }
    );
  }
});

// DELETE /api/assets/[id]/documents/[documentId] - Delete a specific document
export const DELETE = withRole(['ADMIN', 'MANAGER'], async function DELETE(
  request: Request,
  { params }: { params: { id: string; documentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract IDs from URL
    const url = new URL(request.url);
    const { assetId, documentId } = extractIdsFromUrl(url.pathname);

    if (!assetId || !documentId) {
      return NextResponse.json({ error: 'Asset ID and Document ID are required' }, { status: 400 });
    }

    // Check if the document exists and belongs to the specified asset
    const existingDocument = await prisma.document.findFirst({
      where: {
        id: documentId,
        assetId: assetId,
      },
    });

    if (!existingDocument) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Delete the document
    await prisma.document.delete({
      where: {
        id: documentId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
});
