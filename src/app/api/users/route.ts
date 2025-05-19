import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

import { hasPermission } from './[id]/route';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(await hasPermission(session.user, 'User view (list and detail)'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    // Get the role from query parameters
    const url = new URL(request.url);
    const role = url.searchParams.get('role');

    // Build the query
    const query: any = {};
    if (role) {
      query.role = role;
    }

    const users = await prisma.user.findMany({
      where: query,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(await hasPermission(session.user, 'User create'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, email, password, role } = body;

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password,
        role,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
