import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { assetId: string } }) {
  const { assetId } = params;
  if (!assetId) {
    return new Response(JSON.stringify({ error: 'Missing assetId' }), { status: 400 });
  }

  // Check asset exists and get its depreciation parameters
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    select: {
      id: true,
      name: true,
      unitPrice: true,
      sivDate: true,
      usefulLifeYears: true,
      residualPercentage: true,
      salvageValue: true,
      depreciationMethod: true,
    }
  });

  if (!asset) {
    return new Response(JSON.stringify({ error: 'Asset not found' }), { status: 404 });
  }

  // Calculate depreciation schedule on-the-fly using the same method as asset reports
  try {
    const { calculateMonthlyDepreciation } = await import('@/utils/depreciation');

    const depreciableCost = asset.unitPrice || 0;
    const salvageValue = asset.salvageValue || (asset.residualPercentage ? (depreciableCost * asset.residualPercentage / 100) : 0);
    const usefulLifeYears = asset.usefulLifeYears || 5;
    const method = asset.depreciationMethod || 'STRAIGHT_LINE';
    const sivDate = asset.sivDate;

    if (!sivDate || depreciableCost <= 0) {
      return new Response(JSON.stringify({ schedule: [] }), { status: 200 });
    }

    const sivDateString = sivDate instanceof Date ? sivDate.toISOString() : new Date(sivDate).toISOString();

    const monthlyResults = calculateMonthlyDepreciation({
      unitPrice: depreciableCost,
      sivDate: sivDateString,
      usefulLifeYears: usefulLifeYears,
      salvageValue: salvageValue,
      method: method,
    });

    // Format the results to match the expected interface
    const schedule = monthlyResults.map(result => ({
      year: result.year,
      month: result.month,
      depreciationExpense: result.depreciationExpense,
      accumulatedDepreciation: result.accumulatedDepreciation,
      bookValue: result.bookValue,
    }));

    return new Response(JSON.stringify({ schedule }), { status: 200 });

  } catch (error) {
    console.error('Error calculating depreciation schedule:', error);
    return new Response(JSON.stringify({ error: 'Failed to calculate depreciation schedule' }), { status: 500 });
  }
}