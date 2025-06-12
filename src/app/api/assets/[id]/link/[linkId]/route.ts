import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; linkId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id, linkId } = await params;

    // Find the link to get information for history records
    const link = await prisma.linkedAsset.findUnique({
      where: { id: linkId },
      include: {
        fromAsset: { select: { name: true } },
        toAsset: { select: { name: true } }
      }
    });

    if (!link) {
      return new NextResponse('Link not found', { status: 404 });
    }

    // Verify that the link belongs to the current asset
    if (link.fromAssetId !== id) {
      return new NextResponse('Link does not belong to this asset', { status: 403 });
    }

    // Delete the link
    await prisma.linkedAsset.delete({
      where: { id: linkId }
    });

    // Create history records for both assets
    await Promise.all([
      prisma.assetHistory.create({
        data: {
          assetId: link.fromAssetId,
          field: 'linkedAssets',
          oldValue: `Linked to ${link.toAsset.name}`,
          newValue: `Unlinked from ${link.toAsset.name}`,
          changedBy: session.user?.email || 'System'
        }
      }),
      prisma.assetHistory.create({
        data: {
          assetId: link.toAssetId,
          field: 'linkedAssets',
          oldValue: `Linked to ${link.fromAsset.name}`,
          newValue: `Unlinked from ${link.fromAsset.name}`,
          changedBy: session.user?.email || 'System'
        }
      })
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/assets/[id]/link/[linkId]:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
