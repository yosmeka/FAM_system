//import { Response } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    console.log('Fetching linked assets from database...');

    // Get all linked assets directly from the database
    const linkedAssets = await prisma.linkedAsset.findMany({
      include: {
        fromAsset: true,
        toAsset: true
      }
    });

    console.log(`Found ${linkedAssets.length} linked assets`);

    // Get all assets
    const assets = await prisma.asset.findMany({
      select: {
        id: true,
        name: true,
        serialNumber: true
      }
    });

    // Return both for debugging
    return Response.json({
      linkedAssets,
      assets,
      count: linkedAssets.length
    });
  } catch (error) {
    console.error('Error fetching linked assets:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
