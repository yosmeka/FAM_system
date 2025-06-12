import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the serial number from the query string
    const { searchParams } = new URL(request.url);
    const serialNumber = searchParams.get('serialNumber');

    if (!serialNumber) {
      return Response.json({ error: 'Serial number is required' }, { status: 400 });
    }

    // Check if an asset with this serial number exists
    const existingAsset = await prisma.asset.findUnique({
      where: {
        serialNumber: serialNumber,
      },
      select: {
        id: true,
      },
    });

    return Response.json({ exists: !!existingAsset });
  } catch (error) {
    console.error('Error checking serial number:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
