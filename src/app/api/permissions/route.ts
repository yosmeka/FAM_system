import { NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';

export async function GET() {
  // Return all permissions
  // @ts-ignore: Prisma client may not be up to date
  const permissions = await prisma.permission.findMany();
  return NextResponse.json({ permissions });
}
