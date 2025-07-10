import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: assetId } = await params;
    if (!assetId) {
      return Response.json({ error: 'Asset ID is required' }, { status: 400 });
    }

    const history = await prisma.assetHistory.findMany({
      where: {
        assetId: assetId,
      },
      orderBy: {
        changedAt: 'desc',
      },
      select: {
        id: true,
        field: true,
        oldValue: true,
        newValue: true,
        changedAt: true,
        changedBy: true
      }
    });

    return Response.json(history);
  } catch (error) {
    console.error('Error fetching asset history:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}