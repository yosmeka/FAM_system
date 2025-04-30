// import { NextResponse } from 'next/server';
// import { getServerSession } from 'next-auth';
// import { authOptions } from '@/lib/auth';
// import { prisma } from '@/lib/prisma';

// export async function GET(
//   request: Request,
//   { params }: { params: { id: string } }
// ) {
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     const assetId = params.id;
//     if (!assetId) {
//       return NextResponse.json({ error: 'Asset ID is required' }, { status: 400 });
//     }

//     const history = await prisma.assetHistory.findMany({
//       where: {
//         assetId: assetId,
//       },
//       orderBy: {
//         changedAt: 'desc',
//       },
//       select: {
//         id: true,
//         field: true,
//         oldValue: true,
//         newValue: true,
//         changedAt: true,
//         changedBy: true
//       }
//     });

//     return NextResponse.json(history);
//   } catch (error) {
//     console.error('Error fetching asset history:', error);
//     return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
//   }
// } 