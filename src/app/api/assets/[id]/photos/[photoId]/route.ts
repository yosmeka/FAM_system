import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// DELETE /api/assets/[id]/photos/[photoId] - Delete a specific photo
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; photoId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: assetId, photoId } = params;

    // Verify asset exists
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Find the photo
    const photo = await prisma.assetPhoto.findUnique({
      where: { id: photoId },
    });

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // Verify the photo belongs to the asset
    if (photo.assetId !== assetId) {
      return NextResponse.json({ error: 'Photo does not belong to this asset' }, { status: 400 });
    }

    // Delete the file from disk
    const fullFilePath = join(process.cwd(), 'public', photo.filePath);
    if (existsSync(fullFilePath)) {
      try {
        await unlink(fullFilePath);
      } catch (fileError) {
        console.error('Error deleting file from disk:', fileError);
        // Continue with database deletion even if file deletion fails
      }
    }

    // Delete the photo record from database
    await prisma.assetPhoto.delete({
      where: { id: photoId },
    });

    return NextResponse.json({ message: 'Photo deleted successfully' });
  } catch (error) {
    console.error('Error deleting photo:', error);
    return NextResponse.json(
      { error: 'Failed to delete photo' },
      { status: 500 }
    );
  }
}

// GET /api/assets/[id]/photos/[photoId] - Get a specific photo
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; photoId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: assetId, photoId } = params;

    // Find the photo
    const photo = await prisma.assetPhoto.findUnique({
      where: { id: photoId },
      include: {
        asset: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // Verify the photo belongs to the asset
    if (photo.assetId !== assetId) {
      return NextResponse.json({ error: 'Photo does not belong to this asset' }, { status: 400 });
    }

    return NextResponse.json(photo);
  } catch (error) {
    console.error('Error fetching photo:', error);
    return NextResponse.json(
      { error: 'Failed to fetch photo' },
      { status: 500 }
    );
  }
}
