import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        // Get total assets and status counts
        const totalAssets = await prisma.asset.count();
        const activeAssets = await prisma.asset.count({
            where: { status: 'ACTIVE' }
        });
        const disposedAssets = await prisma.asset.count({
            where: { status: 'DISPOSED' }
        });

        // Calculate total purchase value
        const totalValue = await prisma.asset.aggregate({
            _sum: {
                unitPrice: true
            }
        });

        // Get monthly depreciation data (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const monthlyDepreciation = await prisma.asset.groupBy({
            by: ['sivDate'],
            where: {
                sivDate: {
                    gte: sixMonthsAgo
                }
            },
            _sum: {
                currentValue: true,
                unitPrice: true
            }
        });

        // Get asset status distribution
        const statusDistribution = await prisma.asset.groupBy({
            by: ['status'],
            _count: {
                id: true
            }
        });

        // Get asset category distribution
        const categoryDistribution = await prisma.asset.groupBy({
            by: ['category'],
            _count: {
                id: true,
            },
            _sum: {
                unitPrice: true
            }
        });

        // Get asset value trend (last 6 months)
        const valueTrend = await prisma.asset.groupBy({
            by: ['sivDate'],
            where: {
                sivDate: {
                    gte: sixMonthsAgo
                }
            },
            _sum: {
                currentValue: true
            }
        });

        // Format the data
        const formattedData = {
            stats: {
                totalAssets,
                activeAssets,
                disposedAssets,
                totalValue: totalValue._sum.unitPrice || 0
            },
            monthlyDepreciation: monthlyDepreciation.map((item: {
                sivDate: Date;
                _sum: {
                    currentValue: number | null;
                    unitPrice: number | null;
                }
            }) => ({
                month: item.sivDate.toISOString().split('T')[0],
                depreciation: (item._sum.unitPrice || 0) - (item._sum.currentValue || 0)
            })),
            statusDistribution: statusDistribution.map((item: {
                status: string;
                _count: {
                    id: number;
                }
            }) => ({
                status: item.status,
                count: item._count.id
            })),
            categoryDistribution: categoryDistribution.map((item: {
                category: string | null;
                _count: {
                    id: number;
                };
                _sum: {
                    unitPrice: number | null;
                }
            }) => ({
                category: item.category || 'Uncategorized',
                count: item._count.id,
                value: item._sum.unitPrice || 0
            })),
            valueTrend: valueTrend.map((item: {
                sivDate: Date;
                _sum: {
                    currentValue: number | null;
                }
            }) => ({
                month: item.sivDate.toISOString().split('T')[0],
                value: item._sum.currentValue || 0
            }))
        };

        return Response.json(formattedData);
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        return Response.json(
            { error: 'Failed to fetch dashboard data' },
            { status: 500 }
        );
    }
} 