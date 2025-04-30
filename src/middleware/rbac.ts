// Role-Based Access Control (RBAC) middleware for Next.js API routes
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export function withRole(allowedRoles: string[], handler: Function) {
  return async function (req: NextRequest, ...args: any[]) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return handler(req, ...args);
  };
}

// Usage Example (in a route):
// import { withRole } from '@/middleware/rbac';
// export const GET = withRole(['ADMIN'], async (req) => { ... });
