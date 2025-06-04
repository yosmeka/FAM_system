import { NextResponse } from 'next/server';
// Fallback: hardcode roles if Prisma enum import fails
const roles = ['ADMIN', 'MANAGER', 'USER', 'AUDITOR']; // Added AUDITOR

export async function GET() {
  // Return all roles from the hardcoded array
  return NextResponse.json({ roles });
}
