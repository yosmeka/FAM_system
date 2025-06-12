import { NextRequest} from 'next/server';
import { prisma } from '../../../../../../lib/server/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { compare, hash } from 'bcryptjs';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.id !== id) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { currentPassword, newPassword } = body;
    if (!currentPassword || !newPassword) {
      return Response.json({ error: 'Missing fields' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || !user.password) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const isMatch = await compare(currentPassword, user.password);
    if (!isMatch) {
      return Response.json({ error: 'Incorrect current password' }, { status: 400 });
    }

    const hashed = await hash(newPassword, 10);
    await prisma.user.update({ where: { id }, data: { password: hashed } });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}