import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Return all permissions
    // @ts-ignore: Prisma client may not be up to date
    const permissions = await prisma.permission.findMany();
    return Response.json({ permissions });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return Response.json(
      { error: 'Failed to fetch permissions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
