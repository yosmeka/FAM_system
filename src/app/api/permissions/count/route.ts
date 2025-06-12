//import { Response } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const count = await prisma.permission.count();
  return Response.json({ count });
}
