import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import crypto from 'crypto';

// POST /api/documents
// Creates a new document
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    console.log(`POST /api/documents - Session:`, session?.user);
    
    // Allow document creation for server-side calls
    const body = await request.json();
    console.log(`Creating document with data:`, body);
    
    // Generate a unique ID for the document
    const id = crypto.randomUUID();
    
    // Create the document in the database
    const document = await prisma.document.create({
      data: {
        id,
        assetId: body.assetId,
        type: body.type,
        url: body.url,
        fileName: body.fileName,
        fileSize: body.fileSize,
        filePath: body.filePath,
        mimeType: body.mimeType || 'application/pdf',
        meta: body.meta || {},
      },
    });
    
    console.log(`Created document with ID: ${document.id}`);
    return Response.json({ document });
  } catch (error) {
    console.error('Error creating document:', error);
    return Response.json(
      { error: 'Failed to create document' },
      { status: 500 }
    );
  }
}

// GET /api/documents
// Lists all documents
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get query parameters
    const url = new URL(request.url);
    const assetId = url.searchParams.get('assetId');
    const type = url.searchParams.get('type');
    const transferId = url.searchParams.get('transferId');
    
    // Build the query
    const where: any = {};
    
    if (assetId) {
      where.assetId = assetId;
    }
    
    if (type) {
      where.type = type;
    }
    
    // Get documents
    const documents = await prisma.document.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    // Filter by transferId if provided
    let filteredDocuments = documents;
    if (transferId) {
      filteredDocuments = documents.filter(doc => {
        if (doc.meta && typeof doc.meta === 'object') {
          const meta = doc.meta as any;
          return meta.transferId === transferId;
        }
        return false;
      });
    }
    
    return Response.json({ documents: filteredDocuments });
  } catch (error) {
    console.error('Error listing documents:', error);
    return Response.json(
      { error: 'Failed to list documents' },
      { status: 500 }
    );
  }
}
