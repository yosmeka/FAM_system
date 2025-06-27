// Enhanced Role-Based Access Control (RBAC) middleware for Next.js API routes
// Supports both session and JWT authentication
import { NextRequest } from 'next/server';
import { apiMiddleware, AuthContext } from './api';

export function withRole(allowedRoles: string[], handler: Function) {
  return async function (req: NextRequest, ...args: any[]) {
    const authResult = await apiMiddleware(req, allowedRoles as any);

    if ('error' in authResult) {
      return authResult.error;
    }

    // Add auth context to request for handler access
    (req as any).auth = authResult.auth;

    return handler(req, ...args);
  };
}

/**
 * Enhanced middleware with explicit auth context passing
 */
export function withAuth(handler: (req: NextRequest, auth: AuthContext, ...args: any[]) => Promise<Response>) {
  return async function (req: NextRequest, ...args: any[]) {
    const authResult = await apiMiddleware(req);

    if ('error' in authResult) {
      return authResult.error;
    }

    return handler(req, authResult.auth, ...args);
  };
}

/**
 * Middleware for specific role with auth context
 */
export function withRoleAndAuth(
  allowedRoles: string[],
  handler: (req: NextRequest, auth: AuthContext, ...args: any[]) => Promise<Response>
) {
  return async function (req: NextRequest, ...args: any[]) {
    const authResult = await apiMiddleware(req, allowedRoles as any);

    if ('error' in authResult) {
      return authResult.error;
    }

    return handler(req, authResult.auth, ...args);
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
