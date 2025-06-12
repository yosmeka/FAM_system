import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    console.log("DEBUGGING API - POST /api/assets/[id]/link");
    console.log("DEBUGGING API - Asset ID:", id);

    const session = await getServerSession(authOptions);
    if (!session) {
      console.log("DEBUGGING API - Unauthorized");
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { toAssetId } = body;
    console.log("DEBUGGING API - Target Asset ID:", toAssetId);

    if (!toAssetId) {
      console.log("DEBUGGING API - Missing required fields");
      return new NextResponse('Missing required fields', { status: 400 });
    }

    // Prevent linking an asset to itself
    if (id === toAssetId) {
      console.log("DEBUGGING API - Cannot link an asset to itself");
      return new NextResponse('Cannot link an asset to itself', { status: 400 });
    }

    // Check if both assets exist
    const [fromAsset, toAsset] = await Promise.all([
      prisma.asset.findUnique({
        where: { id },
        include: {
          linkedTo: true,
          linkedFrom: true
        }
      }),
      prisma.asset.findUnique({
        where: { id: toAssetId },
        include: {
          linkedTo: true,
          linkedFrom: true
        }
      })
    ]);

    console.log("DEBUGGING API - From Asset found:", !!fromAsset);
    console.log("DEBUGGING API - To Asset found:", !!toAsset);

    if (!fromAsset || !toAsset) {
      console.log("DEBUGGING API - One or both assets not found");
      return new NextResponse('One or both assets not found', { status: 404 });
    }

    console.log("DEBUGGING API - From Asset linked to count:", fromAsset.linkedTo?.length || 0);
    console.log("DEBUGGING API - From Asset linked from count:", fromAsset.linkedFrom?.length || 0);
    console.log("DEBUGGING API - To Asset linked to count:", toAsset.linkedTo?.length || 0);
    console.log("DEBUGGING API - To Asset linked from count:", toAsset.linkedFrom?.length || 0);

    // Check if the target asset is already a parent of another asset
    const isParent = await prisma.linkedAsset.findFirst({
      where: {
        fromAssetId: toAssetId
      }
    });

    if (isParent) {
      console.log("DEBUGGING API - Cannot link to an asset that is already a parent");
      return new NextResponse('Cannot link to an asset that is already a parent', { status: 400 });
    }

    // Check if the target asset is already a child of another asset
    const isChild = await prisma.linkedAsset.findFirst({
      where: {
        toAssetId: toAssetId
      }
    });

    if (isChild) {
      console.log("DEBUGGING API - Cannot link to an asset that is already a child of another asset");
      return new NextResponse('Cannot link to an asset that is already a child of another asset', { status: 400 });
    }

    // Check if the current asset is already a child of another asset
    const isCurrentAssetChild = await prisma.linkedAsset.findFirst({
      where: {
        toAssetId: id
      }
    });

    if (isCurrentAssetChild) {
      console.log("DEBUGGING API - This asset is already a child of another asset and cannot have children of its own");
      return new NextResponse('This asset is already a child of another asset and cannot have children of its own', { status: 400 });
    }

    // Check if link already exists
    const existingLink = await prisma.linkedAsset.findUnique({
      where: {
        fromAssetId_toAssetId: {
          fromAssetId: id,
          toAssetId: toAssetId
        }
      }
    });

    if (existingLink) {
      console.log("DEBUGGING API - Assets are already linked");
      return new NextResponse('Assets are already linked', { status: 400 });
    }

    // Create the link
    console.log("DEBUGGING API - Creating link");
    const linkedAsset = await prisma.linkedAsset.create({
      data: {
        fromAssetId: id,
        toAssetId: toAssetId
      }
    });
    console.log("DEBUGGING API - Link created:", linkedAsset);

    // Create history records for both assets
    console.log("DEBUGGING API - Creating history records");
    await Promise.all([
      prisma.assetHistory.create({
        data: {
          assetId: id,
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
    console.log("DEBUGGING API - History records created");

    // Verify the link was created
    const verifyLink = await prisma.linkedAsset.findUnique({
      where: {
        fromAssetId_toAssetId: {
          fromAssetId: id,
          toAssetId: toAssetId
        }
      },
      include: {
        fromAsset: true,
        toAsset: true
      }
    });

    console.log("DEBUGGING API - Verified link:", verifyLink);

    return NextResponse.json(linkedAsset);
  } catch (error) {
    console.error('DEBUGGING API - Error in POST /api/assets/[id]/link:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
