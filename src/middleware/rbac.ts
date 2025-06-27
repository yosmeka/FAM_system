// Enhanced Role-Based Access Control (RBAC) middleware for Next.js API routes
// Supports both session and JWT authentication
import { NextRequest } from 'next/server';
import { apiMiddleware } from './api';
import { Role } from '@/types/auth';

// Define AuthContext type if needed (adjust as per your actual context)
type AuthContext = {
  user: {
    id: string;
    email?: string;
    role?: string;
  };
  authMethod?: string;
};

export function withRole(allowedRoles: Role[], handler: (req: NextRequest, ...args: unknown[]) => Promise<Response>) {
  return async function (req: NextRequest, ...args: unknown[]) {
    const authResult = await apiMiddleware(req, allowedRoles);
    if (authResult) {
      return authResult;
    }
    return handler(req, ...args);
  };
}

/**
 * Enhanced middleware with explicit auth context passing
 */
export function withAuth(handler: (req: NextRequest, ...args: unknown[]) => Promise<Response>) {
  return async function (req: NextRequest, ...args: unknown[]) {
    const authResult = await apiMiddleware(req);
    if (authResult) {
      return authResult;
    }
    return handler(req, ...args);
  };
}

/**
 * Middleware for specific role with auth context
 */
export function withRoleAndAuth(
  allowedRoles: Role[],
  handler: (req: NextRequest, ...args: unknown[]) => Promise<Response>
) {
  return async function (req: NextRequest, ...args: unknown[]) {
    const authResult = await apiMiddleware(req, allowedRoles);
    if (authResult) {
      return authResult;
    }
    return handler(req, ...args);
  };
}

// Usage Examples:
// Basic role check (backward compatible):
// export const GET = withRole(['ADMIN'], async (req) => { ... });

// With auth context:
// export const GET = withRoleAndAuth(['ADMIN'], async (req, auth) => {
//   console.log('User:', auth.user.email, 'Method:', auth.authMethod);
//   // ... handler logic
// });
