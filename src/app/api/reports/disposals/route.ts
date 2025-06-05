import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/reports/disposals
export async function GET() {
  try {
    const now = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    // Fetch all required data in parallel
    const [
      currentMonthDisposals,
      lastMonthDisposals,
      methodDistributionData,
      disposedAssets,
      pendingCount,
      approvedCount,
      rejectedCount,
    ] = await Promise.all([
      // Current month's disposals
      prisma.disposal.count({
        where: {
          createdAt: {
            gte: new Date(now.getFullYear(), now.getMonth(), 1),
          },
          status: {
            in: ['APPROVED', 'REJECTED']
          }
        },
      }),

      // Last month's disposals
      prisma.disposal.count({
        where: {
          createdAt: {
            gte: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1),
            lt: new Date(now.getFullYear(), now.getMonth(), 1),
          },
          status: {
            in: ['APPROVED', 'REJECTED']
          }
        },
      }),

      // Method distribution
      prisma.disposal.groupBy({
        by: ['method'],
        _count: {
          id: true,
        },
        where: {
          status: {
            in: ['APPROVED', 'REJECTED']
          }
        }
      }),

      // Fetch disposed assets with details
      prisma.disposal.findMany({
        where: {
          status: {
            in: ['APPROVED', 'REJECTED']
          }
        },
        include: {
          asset: {
            select: {
              name: true,
              serialNumber: true,
              category: true,
              purchasePrice: true,
              purchaseDate: true,
            }
          },
          requester: {
            select: {
              name: true,
              email: true,
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),

      // Count pending disposals
      prisma.disposal.count({
        where: { status: 'PENDING' }
      }),

      // Count approved disposals
      prisma.disposal.count({
        where: { status: 'APPROVED' }
      }),

      // Count rejected disposals
      prisma.disposal.count({
        where: { status: 'REJECTED' }
      }),
    ]);

    // Calculate disposal growth
    const disposalGrowth =
      lastMonthDisposals > 0
        ? ((currentMonthDisposals - lastMonthDisposals) / lastMonthDisposals) * 100
        : 0;

    // Process method distribution
    const methodDistribution = methodDistributionData.map((method: any) => ({
      method: method.method,
      count: method._count.id,
    }));

    // Ensure we have at least one method
    if (methodDistribution.length === 0) {
      methodDistribution.push({ method: 'No disposals', count: 0 });
    }

    // Calculate status distribution
    const statusDistribution = [
      {
        status: 'APPROVED',
        count: approvedCount
      },
      {
        status: 'REJECTED',
        count: rejectedCount
      }
    ];

    return NextResponse.json({
      stats: {
        totalDisposals: disposedAssets.length,
        pendingDisposals: pendingCount,
        approvedDisposals: approvedCount,
        rejectedDisposals: rejectedCount,
        disposalGrowth: Math.round(disposalGrowth * 10) / 10,
      },
      methodDistribution,
      statusDistribution,
      disposedAssets: disposedAssets.map((disposal: any) => ({
        id: disposal.id,
        assetName: disposal.asset.name,
        serialNumber: disposal.asset.serialNumber,
        category: disposal.asset.category,
        purchasePrice: disposal.asset.purchasePrice,
        purchaseDate: disposal.asset.purchaseDate,
        disposalDate: disposal.createdAt,
        method: disposal.method,
        status: disposal.status,
        actualValue: disposal.actualValue,
        expectedValue: disposal.expectedValue,
        requesterName: disposal.requester.name,
        requesterEmail: disposal.requester.email,
      })),
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate disposal reports' },
      { status: 500 }
    );
  }
}
