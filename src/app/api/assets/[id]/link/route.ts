import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { toAssetId } = body;

    if (!toAssetId) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    // Check if both assets exist
    const [fromAsset, toAsset] = await Promise.all([
      prisma.asset.findUnique({ where: { id: params.id } }),
      prisma.asset.findUnique({ where: { id: toAssetId } })
    ]) as [{ name: string } | null, { name: string } | null];

    if (!fromAsset || !toAsset) {
      return new NextResponse('One or both assets not found', { status: 404 });
    }

    // Check if link already exists
    const existingLink = await prisma.linkedAsset.findUnique({
      where: {
        fromAssetId_toAssetId: {
          fromAssetId: params.id,
          toAssetId: toAssetId
        }
      }
    });

    if (existingLink) {
      return new NextResponse('Assets are already linked', { status: 400 });
    }

    // Create the link
    const linkedAsset = await prisma.linkedAsset.create({
      data: {
        fromAssetId: params.id,
        toAssetId: toAssetId
      }
    });

    // Create history records for both assets
    await Promise.all([
      prisma.assetHistory.create({
        data: {
          assetId: params.id,
          field: 'linkedAssets',
          oldValue: null,
          newValue: `Linked to ${toAsset.name}`,
          changedBy: session.user?.email || 'System'
        }
      }),
      prisma.assetHistory.create({
        data: {
          assetId: toAssetId,
          field: 'linkedAssets',
          oldValue: null,
          newValue: `Linked to ${fromAsset.name}`,
          changedBy: session.user?.email || 'System'
        }
      })
    ]);

    return NextResponse.json(linkedAsset);
  } catch (error) {
    console.error('Error in POST /api/assets/[id]/link:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
