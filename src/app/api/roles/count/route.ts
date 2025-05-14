import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  // Role is an enum, not a table. Count enum values manually
  const roles = ["ADMIN", "MANAGER", "USER"];
  const count = roles.length;
  return NextResponse.json({ count });
}
