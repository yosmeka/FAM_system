import { NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      amount,
      date,
      method,
      usefulLife,
      salvageValue,
      depreciationRate,
      description
    } = body;

    const depreciation = await prisma.Depreciation.create({
      data: {
        assetId: params.id,
        amount,
        date: new Date(date),
        method,
        usefulLife,
        salvageValue,
        depreciationRate,
        description,
      },
    });

    return NextResponse.json(depreciation);
  } catch (error) {
    console.error('Error creating depreciation:', error);
    return NextResponse.json(
      { error: 'Failed to create depreciation record' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const depreciations = await prisma.Depreciation.findMany({
      where: {
        assetId: params.id,
      },
      orderBy: {
        date: 'asc',
      },
    });

    return NextResponse.json(depreciations);
  } catch (error) {
    console.error('Error fetching depreciations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch depreciation records' },
      { status: 500 }
    );
  }
}
