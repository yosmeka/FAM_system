import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { assetId: string } }) {
  const { assetId } = params;
  if (!assetId) {
    return new Response(JSON.stringify({ error: 'Missing assetId' }), { status: 400 });
  }
  // Check asset exists
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset) {
    return new Response(JSON.stringify({ error: 'Asset not found' }), { status: 404 });
  }
  // Get schedule
  const schedule = await prisma.depreciationSchedule.findMany({
    where: { assetId },
    orderBy: [
      { year: 'asc' },
      { month: 'asc' },
    ],
    select: {
      year: true,
      month: true,
      bookValue: true,
      // If you store depreciationExpense/accumulatedDepreciation, add here
    },
  });
  // Optionally, calculate depreciationExpense/accumulatedDepreciation if not stored
  // For now, just return bookValue per month
  return new Response(JSON.stringify({ schedule }), { status: 200 });
} 