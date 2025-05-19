import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Returns user registration count per month for the last 12 months
export async function GET() {
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }).reverse();

  const userGrowth = await Promise.all(
    months.map(async ({ year, month }) => {
      const count = await prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(year, month - 1, 1),
            lt: new Date(year, month, 1),
          },
        },
      });
      return { year, month, count };
    })
  );

  return NextResponse.json({ userGrowth });
}
