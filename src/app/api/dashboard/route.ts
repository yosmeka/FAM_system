import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        // Get total assets and status counts
        const totalAssets = await prisma.asset.count();
        const activeAssets = await prisma.asset.count({
            where: { status: 'ACTIVE' }
        });
        const underMaintenanceAssets = await prisma.asset.count({
            where: { status: 'UNDER_MAINTENANCE' }
        });

        // Calculate total value
        const totalValue = await prisma.asset.aggregate({
            _sum: {
                currentValue: true
            }
        });

        // Get monthly depreciation data (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const monthlyDepreciation = await prisma.asset.groupBy({
            by: ['purchaseDate'],
            where: {
                purchaseDate: {
                    gte: sixMonthsAgo
                }
            },
            _sum: {
                currentValue: true,
                purchasePrice: true
            }
        });

        // Get asset status distribution
        const statusDistribution = await prisma.asset.groupBy({
            by: ['status'],
            _count: {
                id: true
            }
        });

        // Format the data
        const formattedData = {
            stats: {
                totalAssets,
                activeAssets,
                underMaintenanceAssets,
                totalValue: totalValue._sum.currentValue || 0
            },
            monthlyDepreciation: monthlyDepreciation.map((item: {
                purchaseDate: Date;
                _sum: {
                    currentValue: number | null;
                    purchasePrice: number | null;
                }
            }) => ({
                month: item.purchaseDate.toISOString().split('T')[0],
                depreciation: (item._sum.purchasePrice || 0) - (item._sum.currentValue || 0)
            })),
            statusDistribution: statusDistribution.map((item: {
                status: string;
                _count: {
                    id: number;
                }
            }) => ({
                status: item.status,
                count: item._count.id
            }))
        };

        return NextResponse.json(formattedData);
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        return NextResponse.json(
            { error: 'Failed to fetch dashboard data' },
            { status: 500 }
        );
    }
} 