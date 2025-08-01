//import { Response } from 'next/server';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { Role } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hash } from 'bcryptjs'; // Import hash function

import { hasPermission } from '@/lib/permissions';
import { sendUserCreationEmail } from '@/lib/server/email';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  // Allow managers to view users for assignment purposes, and admins for user management
  const userWithRole = session?.user ? { ...session.user, role: session.user.role as Role } : undefined;
  const canViewUsers = session?.user?.role === 'ADMIN' ||
    session?.user?.role === 'MANAGER' ||
    (userWithRole && await hasPermission(userWithRole, 'User view (list and detail)'));

  if (!session?.user || !canViewUsers) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    // Get the role from query parameters
    const url = new URL(request.url);
    const role = url.searchParams.get('role');

    // Build the query
    const query: { role?: Role } = {};
    if (role) {
      query.role = role as Role;
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

    return Response.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userWithRolePost = session?.user ? { ...session.user, role: session.user.role as Role } : undefined;
  if (!session?.user || !(userWithRolePost && await hasPermission(userWithRolePost, 'User create'))) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, email, password, role } = body;

    if (!password) {
      return Response.json({ error: 'Password is required' }, { status: 400 });
    }

    const hashedPassword = await hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword, // Store hashed password
        role: role as Role,
      },
    });

    // Send welcome email with credentials
    try {
      await sendUserCreationEmail({
        email,
        name: name || email,
        password,
        role,
      });
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
      // Don't fail the user creation if email fails
    }

    // Return user object without the password
    const { password: _password, ...userWithoutPassword } = user; // _password signals intentional omission
    return Response.json(userWithoutPassword);
  } catch (error: any) {
    console.error('Error creating user:', error);
    // Check if this is a Prisma unique constraint error
    if (error?.code === 'P2002') {
      return Response.json(
        { error: 'Email already in use. Please use a different email address.' },
        { status: 400 }
      );
    }
    return Response.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
